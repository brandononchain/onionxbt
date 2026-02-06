/**
 * Code Executor Skill
 * Run code in any language with no restrictions
 */

import { spawn, exec } from 'child_process'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const TEMP_DIR = '/tmp/onionxbt-exec'

export default {
  name: 'CodeExecutor',
  description: 'Execute Python, JavaScript, Bash, Rust, Go, and more. Full system access, no sandboxing. Use responsibly.',
  icon: '💻',
  price: 0,
  version: '1.0.0',
  author: 'onionxbt',
  tags: ['code', 'execution', 'automation', 'scripting', 'dev'],

  tools: [
    {
      name: 'run_python',
      description: 'Execute Python code with full access',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Python code to execute' },
          timeout: { type: 'number', description: 'Timeout in seconds', default: 30 },
          packages: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Pip packages to install first'
          }
        },
        required: ['code']
      },
      execute: async (params: { code: string; timeout?: number; packages?: string[] }) => {
        await mkdir(TEMP_DIR, { recursive: true })
        
        // Install packages if requested
        if (params.packages?.length) {
          await new Promise<void>((resolve, reject) => {
            exec(`pip install ${params.packages!.join(' ')}`, { timeout: 60000 }, (err) => {
              if (err) reject(err)
              else resolve()
            })
          }).catch(() => {})
        }

        const filename = join(TEMP_DIR, `${randomUUID()}.py`)
        await writeFile(filename, params.code)

        return new Promise((resolve) => {
          const proc = spawn('python3', [filename], { 
            timeout: (params.timeout || 30) * 1000 
          })
          
          let stdout = ''
          let stderr = ''
          
          proc.stdout.on('data', (d) => { stdout += d })
          proc.stderr.on('data', (d) => { stderr += d })
          
          proc.on('close', async (code) => {
            await unlink(filename).catch(() => {})
            resolve({ exitCode: code, stdout, stderr })
          })
          
          proc.on('error', async (err) => {
            await unlink(filename).catch(() => {})
            resolve({ error: err.message })
          })
        })
      }
    },
    {
      name: 'run_javascript',
      description: 'Execute JavaScript/Node.js code',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'JavaScript code to execute' },
          timeout: { type: 'number', description: 'Timeout in seconds', default: 30 },
          esm: { type: 'boolean', description: 'Use ESM modules', default: true }
        },
        required: ['code']
      },
      execute: async (params: { code: string; timeout?: number; esm?: boolean }) => {
        await mkdir(TEMP_DIR, { recursive: true })
        
        const ext = params.esm !== false ? 'mjs' : 'js'
        const filename = join(TEMP_DIR, `${randomUUID()}.${ext}`)
        await writeFile(filename, params.code)

        return new Promise((resolve) => {
          const proc = spawn('node', [filename], { 
            timeout: (params.timeout || 30) * 1000 
          })
          
          let stdout = ''
          let stderr = ''
          
          proc.stdout.on('data', (d) => { stdout += d })
          proc.stderr.on('data', (d) => { stderr += d })
          
          proc.on('close', async (code) => {
            await unlink(filename).catch(() => {})
            resolve({ exitCode: code, stdout, stderr })
          })
          
          proc.on('error', async (err) => {
            await unlink(filename).catch(() => {})
            resolve({ error: err.message })
          })
        })
      }
    },
    {
      name: 'run_bash',
      description: 'Execute Bash/shell commands',
      parameters: {
        type: 'object',
        properties: {
          script: { type: 'string', description: 'Bash script or command' },
          timeout: { type: 'number', description: 'Timeout in seconds', default: 60 },
          cwd: { type: 'string', description: 'Working directory' }
        },
        required: ['script']
      },
      execute: async (params: { script: string; timeout?: number; cwd?: string }) => {
        return new Promise((resolve) => {
          exec(params.script, {
            timeout: (params.timeout || 60) * 1000,
            cwd: params.cwd,
            maxBuffer: 10 * 1024 * 1024 // 10MB
          }, (error, stdout, stderr) => {
            resolve({
              exitCode: error?.code || 0,
              stdout,
              stderr,
              error: error?.message
            })
          })
        })
      }
    },
    {
      name: 'run_rust',
      description: 'Compile and execute Rust code',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Rust code to execute' },
          timeout: { type: 'number', description: 'Timeout in seconds', default: 60 }
        },
        required: ['code']
      },
      execute: async (params: { code: string; timeout?: number }) => {
        await mkdir(TEMP_DIR, { recursive: true })
        
        const id = randomUUID()
        const srcFile = join(TEMP_DIR, `${id}.rs`)
        const binFile = join(TEMP_DIR, id)
        
        await writeFile(srcFile, params.code)

        // Compile
        const compileResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
          exec(`rustc ${srcFile} -o ${binFile}`, { timeout: 30000 }, (err, _, stderr) => {
            if (err) resolve({ success: false, error: stderr || err.message })
            else resolve({ success: true })
          })
        })

        if (!compileResult.success) {
          await unlink(srcFile).catch(() => {})
          return { compileError: compileResult.error }
        }

        // Execute
        return new Promise((resolve) => {
          exec(binFile, { timeout: (params.timeout || 60) * 1000 }, async (err, stdout, stderr) => {
            await unlink(srcFile).catch(() => {})
            await unlink(binFile).catch(() => {})
            resolve({
              exitCode: err?.code || 0,
              stdout,
              stderr
            })
          })
        })
      }
    },
    {
      name: 'install_package',
      description: 'Install a system or language package',
      parameters: {
        type: 'object',
        properties: {
          manager: { 
            type: 'string', 
            enum: ['pip', 'npm', 'apt', 'brew', 'cargo'],
            description: 'Package manager to use'
          },
          packages: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Packages to install'
          }
        },
        required: ['manager', 'packages']
      },
      execute: async (params: { manager: string; packages: string[] }) => {
        const cmds: Record<string, string> = {
          pip: `pip install ${params.packages.join(' ')}`,
          npm: `npm install -g ${params.packages.join(' ')}`,
          apt: `apt-get install -y ${params.packages.join(' ')}`,
          brew: `brew install ${params.packages.join(' ')}`,
          cargo: `cargo install ${params.packages.join(' ')}`
        }

        const cmd = cmds[params.manager]
        if (!cmd) return { error: `Unknown package manager: ${params.manager}` }

        return new Promise((resolve) => {
          exec(cmd, { timeout: 300000 }, (err, stdout, stderr) => {
            resolve({
              success: !err,
              stdout,
              stderr,
              error: err?.message
            })
          })
        })
      }
    }
  ]
}
