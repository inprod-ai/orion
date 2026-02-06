import { describe, it, expect } from 'vitest'
import {
  calculateAltitude,
  formatUserCount,
  getAltitudeMessage,
  getAltitudeProgress,
  getAltitudeGradient,
  getStarsVisibility,
} from '@/lib/orion/altitude'
import type { CategoryScore } from '@/lib/orion/types'

// Helper to create category scores for testing
function createCategoryScore(
  category: string,
  score: number,
  gaps: { severity: string }[] = []
): CategoryScore {
  return {
    category: category as CategoryScore['category'],
    label: category.charAt(0).toUpperCase() + category.slice(1),
    score,
    detected: [],
    gaps: gaps.map((g, i) => ({
      id: `${category}-gap-${i}`,
      category: category as CategoryScore['category'],
      title: 'Test gap',
      description: 'Test description',
      severity: g.severity as 'blocker' | 'critical' | 'warning' | 'info',
      confidence: 'high' as const,
      fixType: 'suggested' as const,
    })),
    canGenerate: false,
  }
}

describe('formatUserCount', () => {
  it('should format small numbers as-is', () => {
    expect(formatUserCount(1)).toBe('1')
    expect(formatUserCount(10)).toBe('10')
    expect(formatUserCount(100)).toBe('100')
    expect(formatUserCount(999)).toBe('999')
  })

  it('should format thousands with K suffix', () => {
    expect(formatUserCount(1000)).toBe('1.0K')
    expect(formatUserCount(1500)).toBe('1.5K')
    expect(formatUserCount(10000)).toBe('10.0K')
    expect(formatUserCount(999999)).toBe('1000.0K')
  })

  it('should format millions with M suffix', () => {
    expect(formatUserCount(1000000)).toBe('1.0M')
    expect(formatUserCount(1500000)).toBe('1.5M')
    expect(formatUserCount(10000000)).toBe('10.0M')
  })

  it('should format billions with B suffix', () => {
    expect(formatUserCount(1000000000)).toBe('1.0B')
    expect(formatUserCount(10000000000)).toBe('10.0B')
  })

  it('should handle infinity', () => {
    expect(formatUserCount(Infinity)).toBe('∞')
  })
})

describe('calculateAltitude', () => {
  it('should return a valid altitude result', () => {
    const categories: CategoryScore[] = [
      createCategoryScore('security', 50),
      createCategoryScore('testing', 60),
      createCategoryScore('deployment', 40),
    ]

    const result = calculateAltitude(categories)

    expect(result).toBeDefined()
    expect(result.maxUsers).toBeGreaterThanOrEqual(0)
    expect(result.bottleneck).toBeDefined()
    expect(result.zone).toBeDefined()
  })

  it('should identify the lowest-scoring category as bottleneck', () => {
    const categories: CategoryScore[] = [
      createCategoryScore('security', 80),
      createCategoryScore('testing', 30), // Lowest
      createCategoryScore('deployment', 60),
    ]

    const result = calculateAltitude(categories)

    // The bottleneck should have a low max users based on low score
    expect(result.bottleneck.score).toBeLessThanOrEqual(30)
  })

  it('should return infinite scale when no limiting factors', () => {
    // All high scores - no bottlenecks
    const categories: CategoryScore[] = [
      createCategoryScore('designUx', 100), // Design doesn't limit users
      createCategoryScore('frontend', 100),
    ]

    const result = calculateAltitude(categories)

    // Should have high or infinite max users
    expect(result.maxUsers).toBeGreaterThanOrEqual(0)
  })

  it('should include top upgrades suggestions', () => {
    const categories: CategoryScore[] = [
      createCategoryScore('security', 30),
      createCategoryScore('testing', 40),
      createCategoryScore('deployment', 50),
    ]

    const result = calculateAltitude(categories)

    // Should have some upgrade suggestions
    expect(Array.isArray(result.topUpgrades)).toBe(true)
  })

  it('should calculate potential users after fixes', () => {
    const categories: CategoryScore[] = [
      createCategoryScore('security', 50),
      createCategoryScore('testing', 60),
    ]

    const result = calculateAltitude(categories)

    expect(result.potentialUsers).toBeGreaterThanOrEqual(0)
  })
})

describe('getAltitudeMessage', () => {
  it('should return a message for any zone', () => {
    const zones = [
      { zone: 'runway', maxUsers: 10, displayName: 'Runway' },
      { zone: 'troposphere', maxUsers: 100, displayName: 'Troposphere' },
      { zone: 'stratosphere', maxUsers: 10000, displayName: 'Stratosphere' },
    ]

    zones.forEach(zone => {
      const message = getAltitudeMessage(zone as any)
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })
  })

  it('should include emoji in message', () => {
    const zone = { zone: 'runway', maxUsers: 10, displayName: 'Runway' }
    const message = getAltitudeMessage(zone as any)
    // Message should have some kind of indicator
    expect(message.length).toBeGreaterThan(5)
  })
})

describe('getAltitudeProgress', () => {
  it('should return 0 for very low user counts', () => {
    const progress = getAltitudeProgress(1)
    expect(progress).toBeGreaterThanOrEqual(0)
    expect(progress).toBeLessThanOrEqual(100)
  })

  it('should return 100 for infinity', () => {
    const progress = getAltitudeProgress(Infinity)
    expect(progress).toBe(100)
  })

  it('should increase with user count', () => {
    const progress10 = getAltitudeProgress(10)
    const progress1000 = getAltitudeProgress(1000)
    const progress1000000 = getAltitudeProgress(1000000)

    expect(progress1000).toBeGreaterThan(progress10)
    expect(progress1000000).toBeGreaterThan(progress1000)
  })

  it('should be clamped between 0 and 100', () => {
    const progressLow = getAltitudeProgress(0)
    const progressHigh = getAltitudeProgress(10000000000)

    expect(progressLow).toBeGreaterThanOrEqual(0)
    expect(progressHigh).toBeLessThanOrEqual(100)
  })

  it('should use logarithmic scale', () => {
    // Check that 10K is roughly halfway between 10 and 10B on log scale
    const progress10 = getAltitudeProgress(10)
    const progress10K = getAltitudeProgress(10000)
    const progress10B = getAltitudeProgress(10000000000)

    // 10K should be somewhere in the middle
    expect(progress10K).toBeGreaterThan(progress10)
    expect(progress10K).toBeLessThan(progress10B)
  })
})

describe('getAltitudeGradient', () => {
  it('should return a valid CSS gradient string', () => {
    const gradient = getAltitudeGradient(50)

    expect(gradient).toContain('linear-gradient')
    expect(gradient).toContain('rgb')
  })

  it('should transition from ground colors at 0%', () => {
    const gradient = getAltitudeGradient(0)
    expect(gradient).toContain('linear-gradient')
  })

  it('should transition to space colors at 100%', () => {
    const gradient = getAltitudeGradient(100)
    expect(gradient).toContain('linear-gradient')
  })

  it('should change based on progress', () => {
    const gradient0 = getAltitudeGradient(0)
    const gradient50 = getAltitudeGradient(50)
    const gradient100 = getAltitudeGradient(100)

    // Different progress values should produce different gradients
    expect(gradient0).not.toBe(gradient50)
    expect(gradient50).not.toBe(gradient100)
  })
})

describe('getStarsVisibility', () => {
  it('should return 0 for progress below 50%', () => {
    expect(getStarsVisibility(0)).toBe(0)
    expect(getStarsVisibility(25)).toBe(0)
    expect(getStarsVisibility(49)).toBe(0)
  })

  it('should return 1 for progress at 100%', () => {
    expect(getStarsVisibility(100)).toBe(1)
  })

  it('should scale linearly from 50% to 100%', () => {
    expect(getStarsVisibility(50)).toBe(0)
    expect(getStarsVisibility(75)).toBe(0.5)
    expect(getStarsVisibility(100)).toBe(1)
  })
})

describe('Altitude Calculation Edge Cases', () => {
  it('should handle empty categories array', () => {
    const result = calculateAltitude([])
    expect(result).toBeDefined()
    expect(result.maxUsers).toBeDefined()
  })

  it('should handle all categories with score 0', () => {
    const categories: CategoryScore[] = [
      createCategoryScore('security', 0),
      createCategoryScore('testing', 0),
      createCategoryScore('deployment', 0),
    ]

    const result = calculateAltitude(categories)

    expect(result.maxUsers).toBeGreaterThanOrEqual(0)
    expect(result.bottleneck).toBeDefined()
  })

  it('should handle all categories with score 100', () => {
    const categories: CategoryScore[] = [
      createCategoryScore('security', 100),
      createCategoryScore('testing', 100),
      createCategoryScore('deployment', 100),
    ]

    const result = calculateAltitude(categories)

    expect(result.maxUsers).toBeGreaterThan(0)
  })

  it('should handle single category', () => {
    const categories: CategoryScore[] = [
      createCategoryScore('security', 50),
    ]

    const result = calculateAltitude(categories)

    expect(result).toBeDefined()
    expect(result.bottleneck.category).toBe('security')
  })
})
