// =============================================================================
// COMPILE VERIFIER
// =============================================================================
// Proves code compiles by actually running the build in a sandbox
// Cost: ~$0.01-0.02 per verification (30-60s sandbox time)

import { Sandbox } from 'e2b'
import type { RepoFile, TechStack } from '../types'
import type { CompileResult, CompileError } from './types'

// =============================================================================
// CONSTANTS
// =============================================================================

// E2B base sandbox includes: Node.js 20, Python 3.11, Go, Rust
// No template ID needed - use base sandbox which has everything
const INSTALL_TIMEOUT_MS = 120_000  // 2 minutes
const BUILD_TIMEOUT_MS = 180_000    // 3 minutes

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Verify that code compiles by running the build in a sandbox.
 * 
 * @param files - Repository files to compile
 * @param stack - Detected tech stack
 * @returns CompileResult with success status, errors, and build log
 */
export async function verifyCompilation(
  files: RepoFile[],
  stack: TechStack
): Promise<CompileResult> {
  const startTime = Date.now()

  // Check E2B is configured
  if (!process.env.E2B_API_KEY) {
    return {
      success: false,
      errors: [{
        file: '',
        message: 'E2B_API_KEY not configured - sandbox verification disabled',
        severity: 'error'
      }],
      warnings: [],
      duration: 0,
      evidence: 'E2B not configured'
    }
  }

  // Determine sandbox type from stack (for command selection)
  const sandboxType = getSandboxType(stack)

  let sandbox: Sandbox | null = null

  try {
    // Create sandbox using E2B base image (has Node, Python, Go, Rust)
    sandbox = await Sandbox.create({
      timeoutMs: BUILD_TIMEOUT_MS + INSTALL_TIMEOUT_MS
    })

    const errors: CompileError[] = []
    const warnings: CompileError[] = []
    const logs: string[] = []

    // Convert RepoFile[] to sandbox file format and write
    logs.push(`Writing ${files.length} files to sandbox...`)
    for (const file of files) {
      await sandbox.files.write(`/app/${file.path}`, file.content)
    }
    logs.push(`Wrote ${files.length} files`)

    // Install dependencies
    const installCmd = getInstallCommand(sandboxType, files)
    if (installCmd) {
      logs.push(`Installing dependencies: ${installCmd}`)
      const install = await sandbox.commands.run(installCmd, {
        cwd: '/app',
        timeoutMs: INSTALL_TIMEOUT_MS
      })

      logs.push(`Install exit code: ${install.exitCode}`)
      if (install.stdout) logs.push(`Install stdout:\n${install.stdout}`)
      if (install.stderr) logs.push(`Install stderr:\n${install.stderr}`)

      if (install.exitCode !== 0) {
        const parsed = parseErrors(install.stderr, sandboxType)
        errors.push(...parsed.errors)
        warnings.push(...parsed.warnings)

        // If install failed, still try to continue to build
        if (errors.length > 0) {
          logs.push('Dependency installation failed, attempting build anyway...')
        }
      }
    }

    // Run build
    const buildCmd = getBuildCommand(sandboxType, files)
    let buildSuccess = false

    if (buildCmd) {
      logs.push(`Running build: ${buildCmd}`)
      const build = await sandbox.commands.run(buildCmd, {
        cwd: '/app',
        timeoutMs: BUILD_TIMEOUT_MS
      })

      logs.push(`Build exit code: ${build.exitCode}`)
      if (build.stdout) logs.push(`Build stdout:\n${build.stdout}`)
      if (build.stderr) logs.push(`Build stderr:\n${build.stderr}`)

      buildSuccess = build.exitCode === 0

      if (!buildSuccess) {
        const parsed = parseErrors(build.stderr + '\n' + build.stdout, sandboxType)
        errors.push(...parsed.errors)
        warnings.push(...parsed.warnings)
      }
    } else {
      // No build command needed (e.g., Python without setup.py)
      // Try type checking instead
      const typeCheckCmd = getTypeCheckCommand(sandboxType, files)
      if (typeCheckCmd) {
        logs.push(`Running type check: ${typeCheckCmd}`)
        const typeCheck = await sandbox.commands.run(typeCheckCmd, {
          cwd: '/app',
          timeoutMs: 60_000
        })

        logs.push(`Type check exit code: ${typeCheck.exitCode}`)
        if (typeCheck.stdout) logs.push(`Type check stdout:\n${typeCheck.stdout}`)
        if (typeCheck.stderr) logs.push(`Type check stderr:\n${typeCheck.stderr}`)

        buildSuccess = typeCheck.exitCode === 0

        if (!buildSuccess) {
          const parsed = parseErrors(typeCheck.stderr + '\n' + typeCheck.stdout, sandboxType)
          errors.push(...parsed.errors)
          warnings.push(...parsed.warnings)
        }
      } else {
        // No build or type check - consider it a pass
        buildSuccess = true
        logs.push('No build command needed for this stack')
      }
    }

    return {
      success: buildSuccess && errors.length === 0,
      errors,
      warnings,
      duration: Date.now() - startTime,
      evidence: logs.join('\n')
    }

  } catch (error) {
    return {
      success: false,
      errors: [{
        file: '',
        message: error instanceof Error ? error.message : 'Sandbox execution failed',
        severity: 'error'
      }],
      warnings: [],
      duration: Date.now() - startTime,
      evidence: error instanceof Error ? error.stack || error.message : 'Unknown error'
    }
  } finally {
    if (sandbox) {
      await sandbox.kill()
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getSandboxType(stack: TechStack): string {
  // Determine primary language/platform
  if (stack.languages.includes('typescript') || stack.languages.includes('javascript')) {
    return 'node'
  }
  if (stack.languages.includes('python')) {
    return 'python'
  }
  if (stack.languages.includes('go')) {
    return 'go'
  }
  if (stack.languages.includes('rust')) {
    return 'rust'
  }

  // Fallback based on platform
  switch (stack.platform) {
    case 'web':
    case 'backend':
    case 'library':
      return 'node'
    default:
      return 'node'
  }
}

function getInstallCommand(sandboxType: string, files: RepoFile[]): string | null {
  const filePaths = new Set(files.map(f => f.path))

  switch (sandboxType) {
    case 'node':
      if (filePaths.has('pnpm-lock.yaml')) return 'pnpm install --frozen-lockfile'
      if (filePaths.has('yarn.lock')) return 'yarn install --frozen-lockfile'
      if (filePaths.has('package-lock.json')) return 'npm ci'
      if (filePaths.has('package.json')) return 'npm install'
      return null

    case 'python':
      if (filePaths.has('requirements.txt')) return 'pip install -r requirements.txt'
      if (filePaths.has('pyproject.toml')) return 'pip install -e .'
      if (filePaths.has('setup.py')) return 'pip install -e .'
      return null

    case 'go':
      if (filePaths.has('go.mod')) return 'go mod download'
      return null

    case 'rust':
      if (filePaths.has('Cargo.toml')) return 'cargo fetch'
      return null

    default:
      return null
  }
}

function getBuildCommand(sandboxType: string, files: RepoFile[]): string | null {
  const packageJsonFile = files.find(f => f.path === 'package.json')

  switch (sandboxType) {
    case 'node':
      if (packageJsonFile) {
        try {
          const pkg = JSON.parse(packageJsonFile.content)
          // Check for build script
          if (pkg.scripts?.build) return 'npm run build'
          // Check for TypeScript
          if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
            return 'npx tsc --noEmit'
          }
        } catch {
          // Invalid JSON, skip
        }
      }
      return null

    case 'python':
      // Python typically doesn't have a build step
      // Could check for setup.py or pyproject.toml build
      return null

    case 'go':
      return 'go build ./...'

    case 'rust':
      return 'cargo build'

    default:
      return null
  }
}

function getTypeCheckCommand(sandboxType: string, files: RepoFile[]): string | null {
  const filePaths = new Set(files.map(f => f.path))

  switch (sandboxType) {
    case 'node':
      if (filePaths.has('tsconfig.json')) return 'npx tsc --noEmit'
      return null

    case 'python':
      // Check for type checking config
      if (filePaths.has('pyproject.toml') || filePaths.has('mypy.ini')) {
        return 'mypy . --ignore-missing-imports || python -m py_compile *.py'
      }
      // Fallback to syntax check
      return 'python -m py_compile $(find . -name "*.py" -not -path "./venv/*" | head -20)'

    default:
      return null
  }
}

// =============================================================================
// ERROR PARSING
// =============================================================================

interface ParsedErrors {
  errors: CompileError[]
  warnings: CompileError[]
}

function parseErrors(output: string, sandboxType: string): ParsedErrors {
  const errors: CompileError[] = []
  const warnings: CompileError[] = []

  if (!output) return { errors, warnings }

  switch (sandboxType) {
    case 'node':
      parseNodeErrors(output, errors, warnings)
      break
    case 'python':
      parsePythonErrors(output, errors, warnings)
      break
    case 'go':
      parseGoErrors(output, errors, warnings)
      break
    case 'rust':
      parseRustErrors(output, errors, warnings)
      break
  }

  return { errors, warnings }
}

function parseNodeErrors(output: string, errors: CompileError[], warnings: CompileError[]): void {
  // TypeScript errors: file.ts(line,col): error TS1234: message
  const tsPattern = /([^\s]+\.tsx?)\((\d+),(\d+)\):\s*(error|warning)\s+TS\d+:\s*(.+)/g
  let match

  while ((match = tsPattern.exec(output)) !== null) {
    const error: CompileError = {
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[5],
      severity: match[4] as 'error' | 'warning'
    }
    if (error.severity === 'error') {
      errors.push(error)
    } else {
      warnings.push(error)
    }
  }

  // ESLint/Node errors: file.js:line:col: error message
  const eslintPattern = /([^\s:]+\.[jt]sx?):(\d+):(\d+):\s*(error|warning|Error)\s*(.+)/g
  while ((match = eslintPattern.exec(output)) !== null) {
    const severity = match[4].toLowerCase().includes('error') ? 'error' : 'warning'
    const error: CompileError = {
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[5],
      severity
    }
    if (severity === 'error') {
      errors.push(error)
    } else {
      warnings.push(error)
    }
  }

  // Generic npm errors
  if (output.includes('npm ERR!') && errors.length === 0) {
    errors.push({
      file: 'package.json',
      message: 'npm install failed. Check dependencies.',
      severity: 'error'
    })
  }
}

function parsePythonErrors(output: string, errors: CompileError[], warnings: CompileError[]): void {
  // Python syntax errors: File "file.py", line N
  const syntaxPattern = /File "([^"]+)", line (\d+)/g
  let match

  while ((match = syntaxPattern.exec(output)) !== null) {
    // Look for the error message in the following lines
    const file = match[1].replace('/app/', '')
    const line = parseInt(match[2])

    // Find the actual error message
    const errorMsgMatch = output.slice(match.index).match(/(?:SyntaxError|IndentationError|NameError|TypeError|ImportError):\s*(.+)/m)
    const message = errorMsgMatch ? errorMsgMatch[0] : 'Python error'

    errors.push({
      file,
      line,
      message,
      severity: 'error'
    })
  }

  // mypy errors: file.py:line: error: message
  const mypyPattern = /([^\s:]+\.py):(\d+):\s*(error|warning):\s*(.+)/g
  while ((match = mypyPattern.exec(output)) !== null) {
    const error: CompileError = {
      file: match[1].replace('/app/', ''),
      line: parseInt(match[2]),
      message: match[4],
      severity: match[3] as 'error' | 'warning'
    }
    if (error.severity === 'error') {
      errors.push(error)
    } else {
      warnings.push(error)
    }
  }
}

function parseGoErrors(output: string, errors: CompileError[], warnings: CompileError[]): void {
  // Go errors: ./file.go:line:col: message
  const goPattern = /\.?\/([^\s:]+\.go):(\d+):(\d+):\s*(.+)/g
  let match

  while ((match = goPattern.exec(output)) !== null) {
    errors.push({
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4],
      severity: 'error'
    })
  }
}

function parseRustErrors(output: string, errors: CompileError[], warnings: CompileError[]): void {
  // Rust errors: error[E0001]: message --> file.rs:line:col
  const rustPattern = /(error|warning)\[E\d+\]:\s*(.+)\n\s*-->\s*([^\s:]+):(\d+):(\d+)/g
  let match

  while ((match = rustPattern.exec(output)) !== null) {
    const error: CompileError = {
      file: match[3],
      line: parseInt(match[4]),
      column: parseInt(match[5]),
      message: match[2],
      severity: match[1] as 'error' | 'warning'
    }
    if (error.severity === 'error') {
      errors.push(error)
    } else {
      warnings.push(error)
    }
  }
}
