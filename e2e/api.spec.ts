// =============================================================================
// E2E TESTS - API ROUTES
// =============================================================================
// Tests critical API endpoints

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

// =============================================================================
// AUTH ENDPOINTS
// =============================================================================

test.describe('Auth API', () => {
  test('GET /api/auth/login redirects to GitHub', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/auth/login`, {
      maxRedirects: 0, // Don't follow redirects
    })
    
    expect(response.status()).toBe(307) // Redirect
    const location = response.headers()['location']
    expect(location).toContain('github.com/login/oauth')
  })
  
  test('GET /api/auth/me returns null for unauthenticated', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/auth/me`)
    
    expect(response.ok()).toBe(true)
    const data = await response.json()
    expect(data.user).toBeNull()
  })
  
  test('POST /api/auth/logout succeeds', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/logout`)
    
    expect(response.ok()).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})

// =============================================================================
// ANALYZE ENDPOINT
// =============================================================================

test.describe('Analyze API', () => {
  test('POST /api/analyze requires repoUrl', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/analyze`, {
      data: {},
    })
    
    expect(response.status()).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('repoUrl')
  })
  
  test('POST /api/analyze rejects invalid URL', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/analyze`, {
      data: { repoUrl: 'not-a-url' },
    })
    
    expect(response.status()).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid')
  })
  
  test('POST /api/analyze rejects non-GitHub URLs (SSRF protection)', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/analyze`, {
      data: { repoUrl: 'https://evil.com/repo' },
    })
    
    expect(response.status()).toBe(400)
  })
  
  test('POST /api/analyze rejects oversized requests', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/analyze`, {
      data: { repoUrl: 'x'.repeat(2000) },
    })
    
    expect(response.status()).toBe(413)
  })
})

// =============================================================================
// HEALTH ENDPOINT (if exists)
// =============================================================================

test.describe('Health API', () => {
  test.skip('GET /api/health returns status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`)
    
    expect(response.ok()).toBe(true)
    const data = await response.json()
    expect(data.status).toBeDefined()
  })
})

// =============================================================================
// REPOS ENDPOINT
// =============================================================================

test.describe('Repos API', () => {
  test('GET /api/repos requires authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/repos`)
    
    expect(response.status()).toBe(401)
  })
})

// =============================================================================
// STRIPE ENDPOINTS
// =============================================================================

test.describe('Stripe API', () => {
  test('POST /api/stripe/checkout requires authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/stripe/checkout`)
    
    expect(response.status()).toBe(401)
  })
})

// =============================================================================
// GENERATE ENDPOINT
// =============================================================================

test.describe('Generate API', () => {
  test('POST /api/generate requires authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/generate`, {
      data: { repoUrl: 'https://github.com/test/test', gaps: [] },
    })
    
    // Should require auth or return error for invalid input
    expect([401, 400].includes(response.status())).toBe(true)
  })
})

// =============================================================================
// COMPLETE ENDPOINT
// =============================================================================

test.describe('Complete API', () => {
  test('POST /api/complete requires authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/complete`, {
      data: { repoUrl: 'https://github.com/test/test' },
    })
    
    expect([401, 400].includes(response.status())).toBe(true)
  })
})

// =============================================================================
// EXPORT ENDPOINT
// =============================================================================

test.describe('Export API', () => {
  test('POST /api/export/pdf requires Pro tier', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/export/pdf`, {
      data: { scanId: 'test-scan-id' },
    })
    
    // Should require auth
    expect(response.status()).toBe(401)
  })
})

// =============================================================================
// CLI ENDPOINTS
// =============================================================================

test.describe('CLI API', () => {
  test('GET /api/cli/auth initiates OAuth flow', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/cli/auth`, {
      maxRedirects: 0,
    })
    
    // Should redirect to GitHub
    expect([302, 307].includes(response.status())).toBe(true)
  })
  
  test('GET /api/cli/auth/me requires token', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/cli/auth/me`)
    
    expect(response.status()).toBe(401)
  })
})
