// =============================================================================
// PLATFORM UTILITIES - Shared helpers for platform-aware analysis
// =============================================================================

import { Category, CategoryScore, PLATFORM_CATEGORIES, PLATFORM_OVERRIDES, TechStack } from './types'

/**
 * Check if a category applies to the given platform
 */
export function isCategoryApplicable(
  category: Category,
  platform: TechStack['platform']
): boolean {
  const applicableCategories = PLATFORM_CATEGORIES[platform]
  return applicableCategories.includes(category)
}

/**
 * Get the platform-specific label for a category
 */
export function getCategoryLabel(
  category: Category,
  platform: TechStack['platform'],
  defaultLabel: string
): string {
  const overrides = PLATFORM_OVERRIDES[platform]
  if (overrides && overrides[category]) {
    return overrides[category]!.label
  }
  return defaultLabel
}

/**
 * Get platform-specific checks for a category
 */
export function getPlatformChecks(
  category: Category,
  platform: TechStack['platform']
): string[] | null {
  const overrides = PLATFORM_OVERRIDES[platform]
  if (overrides && overrides[category]) {
    return overrides[category]!.checks
  }
  return null
}

/**
 * Create a "not applicable" score for categories that don't apply to this platform
 */
export function notApplicableScore(
  category: Category,
  label: string,
  platform: TechStack['platform']
): CategoryScore {
  return {
    category,
    label,
    score: 100, // Perfect score - not applicable
    detected: [`Not applicable for ${platform} projects`],
    gaps: [],
    canGenerate: false,
  }
}

/**
 * Check platform and return early if category doesn't apply
 * Returns null if category should be analyzed, or CategoryScore if N/A
 */
export function checkPlatformApplicability(
  category: Category,
  label: string,
  platform: TechStack['platform']
): CategoryScore | null {
  if (!isCategoryApplicable(category, platform)) {
    return notApplicableScore(category, label, platform)
  }
  return null
}
