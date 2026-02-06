// =============================================================================
// ALTITUDE CALCULATOR
// Maps category scores to maximum concurrent user capacity
// =============================================================================

import {
  Category,
  CategoryScore,
  AltitudeResult,
  AltitudeLevel,
  ALTITUDE_ZONES,
  CATEGORY_USER_LIMITS,
} from './types'

/**
 * Get the maximum users a category can support at a given score
 */
function getCategoryMaxUsers(category: Category, score: number): { maxUsers: number; reason: string } {
  const limits = CATEGORY_USER_LIMITS.find(c => c.category === category)
  
  if (!limits) {
    // Category not tracked for user limits (e.g., design/ux doesn't hard-limit users)
    return { maxUsers: Infinity, reason: 'Not a scaling bottleneck' }
  }
  
  // Find the highest threshold that's <= score
  const applicable = limits.limits
    .filter(l => l.score <= score)
    .sort((a, b) => b.score - a.score)
  
  if (applicable.length === 0) {
    return limits.limits[0] // Return lowest tier
  }
  
  return { maxUsers: applicable[0].maxUsers, reason: applicable[0].reason }
}

/**
 * Get the altitude zone for a given user count
 */
function getAltitudeZone(maxUsers: number): AltitudeLevel {
  // Find the highest zone that the user count qualifies for
  for (let i = ALTITUDE_ZONES.length - 1; i >= 0; i--) {
    if (maxUsers >= ALTITUDE_ZONES[i].maxUsers) {
      return ALTITUDE_ZONES[i + 1] || ALTITUDE_ZONES[i]
    }
  }
  
  // Find the zone where maxUsers fits
  for (const zone of ALTITUDE_ZONES) {
    if (maxUsers <= zone.maxUsers) {
      return zone
    }
  }
  
  return ALTITUDE_ZONES[ALTITUDE_ZONES.length - 1]
}

/**
 * Format user count for display
 */
export function formatUserCount(users: number): string {
  if (users === Infinity) return '∞'
  if (users >= 1_000_000_000) return `${(users / 1_000_000_000).toFixed(1)}B`
  if (users >= 1_000_000) return `${(users / 1_000_000).toFixed(1)}M`
  if (users >= 1_000) return `${(users / 1_000).toFixed(1)}K`
  return users.toString()
}

/**
 * Calculate altitude (max concurrent users) from category scores
 * 
 * The principle: A chain is only as strong as its weakest link.
 * Your app can only handle as many users as your weakest infrastructure component allows.
 */
export function calculateAltitude(categories: CategoryScore[]): AltitudeResult {
  // Calculate max users for each category
  const categoryLimits = categories
    .filter(c => c.score !== undefined)
    .map(c => {
      const { maxUsers, reason } = getCategoryMaxUsers(c.category, c.score)
      return {
        category: c.category,
        score: c.score,
        maxUsers,
        reason,
        isBottleneck: false,
      }
    })
    // Filter out Infinity (non-bottleneck categories)
    .filter(c => c.maxUsers !== Infinity)
    .sort((a, b) => a.maxUsers - b.maxUsers) // Sort by limiting factor
  
  if (categoryLimits.length === 0) {
    // No limiting factors - theoretical infinite scale
    return {
      bottleneck: {
        category: 'deployment',
        score: 100,
        maxUsers: Infinity,
        reason: 'No detected bottlenecks',
      },
      maxUsers: Infinity,
      zone: ALTITUDE_ZONES[ALTITUDE_ZONES.length - 1],
      categoryLimits: [],
      potentialUsers: Infinity,
      topUpgrades: [],
    }
  }
  
  // Mark the bottleneck(s)
  const lowestMaxUsers = categoryLimits[0].maxUsers
  categoryLimits.forEach(c => {
    c.isBottleneck = c.maxUsers === lowestMaxUsers
  })
  
  const bottleneck = categoryLimits[0]
  const zone = getAltitudeZone(bottleneck.maxUsers)
  
  // Calculate potential users if top gaps were fixed
  // Simulate fixing the top 3 bottlenecks to next tier
  const simulatedLimits = [...categoryLimits]
  for (let i = 0; i < Math.min(3, simulatedLimits.length); i++) {
    const current = simulatedLimits[i]
    const limits = CATEGORY_USER_LIMITS.find(c => c.category === current.category)
    if (limits) {
      const nextTier = limits.limits.find(l => l.score > current.score)
      if (nextTier) {
        simulatedLimits[i] = { ...current, maxUsers: nextTier.maxUsers }
      }
    }
  }
  const potentialUsers = Math.min(...simulatedLimits.map(c => c.maxUsers))
  
  // Calculate top upgrades
  const topUpgrades = categoryLimits
    .slice(0, 5) // Top 5 bottlenecks
    .map(c => {
      const limits = CATEGORY_USER_LIMITS.find(l => l.category === c.category)
      if (!limits) return null
      
      const currentTierIndex = limits.limits.findIndex(l => l.maxUsers === c.maxUsers)
      const nextTier = limits.limits[currentTierIndex + 1]
      
      if (!nextTier) return null
      
      // Estimate effort based on score gap
      const scoreGap = nextTier.score - c.score
      const effort: 'easy' | 'medium' | 'hard' = 
        scoreGap <= 15 ? 'easy' : 
        scoreGap <= 30 ? 'medium' : 'hard'
      
      return {
        category: c.category,
        currentUsers: c.maxUsers,
        potentialUsers: nextTier.maxUsers,
        effort,
      }
    })
    .filter((u): u is NonNullable<typeof u> => u !== null)
  
  return {
    bottleneck,
    maxUsers: bottleneck.maxUsers,
    zone,
    categoryLimits,
    potentialUsers,
    topUpgrades,
  }
}

/**
 * Get a motivational message based on altitude zone
 */
export function getAltitudeMessage(zone: AltitudeLevel): string {
  const messages: Record<string, string> = {
    runway: "🛬 Grounded - Critical issues blocking takeoff",
    troposphere: "🛫 Cleared for takeoff - Basic flight achieved",
    stratosphere: "✈️ Cruising altitude - Ready for real traffic",
    mesosphere: "🚀 Breaking through - Startup scale achieved",
    thermosphere: "🛰️ Near space - Unicorn potential",
    exosphere: "🌍 Low orbit - Enterprise grade",
    orbit: "🌙 Stable orbit - Planet-scale infrastructure",
    lunar: "🚀 Lunar distance - Hyperscale achieved",
    interplanetary: "🌌 Interplanetary - Infinite scale",
  }
  return messages[zone.zone] || "🔭 Status unknown"
}

/**
 * Calculate the visual progress (0-100) for background gradient transition
 * Maps user count to a smooth 0-100 scale for visual animations
 */
export function getAltitudeProgress(maxUsers: number): number {
  if (maxUsers === Infinity) return 100
  if (maxUsers <= 0) return 0
  
  // Use logarithmic scale for smooth progression
  // 10 users = ~0%, 10B users = 100%
  const logUsers = Math.log10(Math.max(1, maxUsers))
  const logMin = 1 // 10 users
  const logMax = 10 // 10B users
  
  const progress = ((logUsers - logMin) / (logMax - logMin)) * 100
  return Math.max(0, Math.min(100, progress))
}

/**
 * Get CSS gradient stops for the altitude visualization
 * Returns colors that transition from ground (brown/green) to space (black/purple)
 */
export function getAltitudeGradient(progress: number): string {
  // Define color stops for the journey
  const stops = [
    { at: 0, color: 'rgb(74, 85, 104)' },     // Gray runway
    { at: 10, color: 'rgb(34, 139, 34)' },     // Green ground
    { at: 25, color: 'rgb(135, 206, 235)' },   // Sky blue (troposphere)
    { at: 40, color: 'rgb(70, 130, 180)' },    // Steel blue (stratosphere)
    { at: 55, color: 'rgb(25, 25, 112)' },     // Midnight blue (mesosphere)
    { at: 70, color: 'rgb(15, 15, 50)' },      // Dark blue (thermosphere)
    { at: 85, color: 'rgb(5, 5, 25)' },        // Near black (exosphere)
    { at: 100, color: 'rgb(0, 0, 0)' },        // Space black
  ]
  
  // Interpolate between stops based on progress
  let fromStop = stops[0]
  let toStop = stops[stops.length - 1]
  
  for (let i = 0; i < stops.length - 1; i++) {
    if (progress >= stops[i].at && progress < stops[i + 1].at) {
      fromStop = stops[i]
      toStop = stops[i + 1]
      break
    }
  }
  
  // Create a gradient that shows current position and what's ahead
  const currentColor = fromStop.color
  const nextColor = toStop.color
  
  return `linear-gradient(to top, ${currentColor} 0%, ${nextColor} 100%)`
}

/**
 * Get stars visibility based on altitude (0 = no stars, 1 = full stars)
 */
export function getStarsVisibility(progress: number): number {
  // Stars start appearing at 50% altitude (mesosphere)
  if (progress < 50) return 0
  return (progress - 50) / 50 // 0 at 50%, 1 at 100%
}

