// =============================================================================
// LOAD TEST VERIFIER - k6 in E2B sandbox
// =============================================================================
// Starts the app and runs k6 load testing against localhost.
// Ramps virtual users until error rate exceeds 5%.
// Cost: ~$0.20-0.50 per scan (5-10 min sandbox)

import { Sandbox } from 'e2b'
import type { RepoFile } from '../types'
import type { LoadTestResult, LoadTestMetrics, LoadTestBottleneck } from './types'

/**
 * Run k6 load testing in an E2B sandbox.
 * Starts the app, generates a k6 script, ramps users.
 */
export async function verifyLoad(
  files: RepoFile[],
  stack: 'node' | 'python' | 'go' = 'node',
  options?: { port?: number; startCommand?: string; healthPath?: string }
): Promise<LoadTestResult> {
  const startTime = Date.now()
  const port = options?.port || 3000
  const healthPath = options?.healthPath || '/'

  if (!process.env.E2B_API_KEY) {
    return emptyResult('E2B_API_KEY not configured', startTime)
  }

  let sandbox: Sandbox | null = null

  try {
    sandbox = await Sandbox.create({ timeoutMs: 600_000 }) // 10 min

    // Write files
    for (const file of files) {
      try {
        await sandbox.files.write(`/app/${file.path}`, file.content)
      } catch {
        // Skip unwritable files
      }
    }

    // Install deps
    const installCmd = stack === 'node' ? 'npm ci 2>/dev/null || npm install' :
      stack === 'python' ? 'pip install -r requirements.txt 2>/dev/null || true' :
      'go mod download 2>/dev/null || true'

    await sandbox.commands.run(installCmd, { cwd: '/app', timeoutMs: 120_000 })

    // Install k6
    await sandbox.commands.run(
      'curl -sL https://github.com/grafana/k6/releases/download/v0.54.0/k6-v0.54.0-linux-amd64.tar.gz | tar xz && mv k6-v0.54.0-linux-amd64/k6 /usr/local/bin/k6',
      { timeoutMs: 60_000 }
    )

    // Detect start command
    let startCmd = options?.startCommand
    if (!startCmd && stack === 'node') {
      const pkgFile = files.find(f => f.path === 'package.json')
      if (pkgFile) {
        try {
          const pkg = JSON.parse(pkgFile.content)
          if (pkg.scripts?.start) startCmd = 'npm start'
          else if (pkg.scripts?.dev) startCmd = 'npm run dev'
        } catch {
          // Ignore parse errors
        }
      }
    }

    if (!startCmd) {
      return emptyResult('No start command detected. Provide a start command for load testing.', startTime)
    }

    // Build first if needed
    const pkgFile = files.find(f => f.path === 'package.json')
    if (pkgFile && stack === 'node') {
      try {
        const pkg = JSON.parse(pkgFile.content)
        if (pkg.scripts?.build && startCmd === 'npm start') {
          await sandbox.commands.run('npm run build', { cwd: '/app', timeoutMs: 180_000 })
        }
      } catch {
        // Ignore
      }
    }

    // Start the app in background
    await sandbox.commands.run(
      `cd /app && ${startCmd} &`,
      { timeoutMs: 5_000 }
    )

    // Wait for app to be ready
    const ready = await waitForReady(sandbox, port, healthPath)
    if (!ready) {
      return emptyResult(`App did not start within 30 seconds on port ${port}`, startTime)
    }

    // Generate k6 load test script
    const k6Script = generateK6Script(port, healthPath)
    await sandbox.files.write('/app/k6-test.js', k6Script)

    // Run k6
    const k6Run = await sandbox.commands.run(
      'k6 run --out json=/app/k6-results.json /app/k6-test.js 2>&1',
      { cwd: '/app', timeoutMs: 300_000 } // 5 min for the actual load test
    )

    // Parse results
    return parseK6Output(k6Run.stdout + k6Run.stderr, startTime)

  } catch (error) {
    return emptyResult(
      error instanceof Error ? error.message : 'Load testing failed',
      startTime
    )
  } finally {
    if (sandbox) {
      await sandbox.kill()
    }
  }
}

async function waitForReady(sandbox: Sandbox, port: number, path: string): Promise<boolean> {
  for (let i = 0; i < 30; i++) {
    const check = await sandbox.commands.run(
      `curl -sf http://localhost:${port}${path} > /dev/null 2>&1 && echo "ready" || echo "waiting"`,
      { timeoutMs: 3_000 }
    )
    if (check.stdout.includes('ready')) return true
    await new Promise(r => setTimeout(r, 1000))
  }
  return false
}

function generateK6Script(port: number, path: string): string {
  return `
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 50 },
    { duration: '20s', target: 100 },
    { duration: '20s', target: 200 },
    { duration: '10s', target: 500 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const res = http.get('http://localhost:${port}${path}');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  sleep(0.1);
}
`
}

function parseK6Output(output: string, startTime: number): LoadTestResult {
  const metrics: LoadTestMetrics = {
    requestsTotal: 0,
    requestsFailed: 0,
    latencyP50: 0,
    latencyP95: 0,
    latencyP99: 0,
    throughput: 0,
  }

  // Parse k6 summary output
  const reqsMatch = output.match(/http_reqs[.\s]*:\s+([\d]+)/)
  const failedMatch = output.match(/http_req_failed[.\s]*:\s+([\d.]+)%/)
  const p50Match = output.match(/med=([\d.]+)/)
  const p95Match = output.match(/p\(95\)=([\d.]+)/)
  const p99Match = output.match(/p\(99\)=([\d.]+)/)
  const rpsMatch = output.match(/http_reqs[.\s]*:\s+[\d]+\s+([\d.]+)\/s/)

  if (reqsMatch) metrics.requestsTotal = parseInt(reqsMatch[1])
  if (failedMatch) metrics.requestsFailed = Math.round(metrics.requestsTotal * parseFloat(failedMatch[1]) / 100)
  if (p50Match) metrics.latencyP50 = parseFloat(p50Match[1])
  if (p95Match) metrics.latencyP95 = parseFloat(p95Match[1])
  if (p99Match) metrics.latencyP99 = parseFloat(p99Match[1])
  if (rpsMatch) metrics.throughput = parseFloat(rpsMatch[1])

  // Determine max concurrent users (estimate from ramp stages where errors stayed < 5%)
  // k6 ramps: 10 -> 50 -> 100 -> 200 -> 500
  const errorRate = metrics.requestsTotal > 0
    ? metrics.requestsFailed / metrics.requestsTotal
    : 1

  let maxConcurrentUsers = 0
  if (errorRate < 0.05) {
    maxConcurrentUsers = 500 // Survived the full ramp
  } else if (errorRate < 0.1) {
    maxConcurrentUsers = 200
  } else if (errorRate < 0.2) {
    maxConcurrentUsers = 100
  } else if (errorRate < 0.5) {
    maxConcurrentUsers = 50
  } else {
    maxConcurrentUsers = 10
  }

  // Determine bottleneck
  const bottleneck: LoadTestBottleneck = detectBottleneck(output, metrics)

  return {
    success: metrics.requestsTotal > 0,
    maxConcurrentUsers,
    metrics,
    bottleneck,
    duration: Date.now() - startTime,
    evidence: output.slice(0, 5000),
  }
}

function detectBottleneck(output: string, metrics: LoadTestMetrics): LoadTestBottleneck {
  const lowerOutput = output.toLowerCase()

  if (lowerOutput.includes('connection refused') || lowerOutput.includes('econnrefused')) {
    return { component: 'api', saturatedAt: 0, errorType: 'Server crashed or stopped accepting connections' }
  }
  if (lowerOutput.includes('too many connections') || lowerOutput.includes('connection pool')) {
    return { component: 'database', saturatedAt: metrics.requestsTotal, errorType: 'Database connection pool exhausted' }
  }
  if (lowerOutput.includes('out of memory') || lowerOutput.includes('heap')) {
    return { component: 'memory', saturatedAt: metrics.requestsTotal, errorType: 'Memory exhaustion' }
  }
  if (metrics.latencyP95 > 5000) {
    return { component: 'cpu', saturatedAt: metrics.requestsTotal, errorType: 'CPU-bound: p95 latency exceeded 5s' }
  }
  if (metrics.requestsFailed > metrics.requestsTotal * 0.05) {
    return { component: 'api', saturatedAt: metrics.requestsTotal, errorType: `${Math.round(metrics.requestsFailed / metrics.requestsTotal * 100)}% error rate` }
  }

  return { component: 'unknown', saturatedAt: 0, errorType: 'No clear bottleneck detected' }
}

function emptyResult(error: string, startTime: number): LoadTestResult {
  return {
    success: false,
    maxConcurrentUsers: 0,
    metrics: { requestsTotal: 0, requestsFailed: 0, latencyP50: 0, latencyP95: 0, latencyP99: 0, throughput: 0 },
    bottleneck: { component: 'unknown', saturatedAt: 0, errorType: error },
    duration: Date.now() - startTime,
    evidence: error,
  }
}
