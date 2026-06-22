#!/usr/bin/env node
/**
 * Dev local Palto : Vite (:5173) + routes /api Vercel (:3000).
 * Évite le conflit quand Vite et Vercel partagent le même port.
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function waitForPort(port, timeoutMs = 90_000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, '127.0.0.1')
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Le port ${port} n’est pas prêt après ${timeoutMs}ms`))
          return
        }
        setTimeout(attempt, 500)
      })
    }
    attempt()
  })
}

function run(label, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  })
  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[dev:${label}] arrêt (${signal})`)
      shutdown(0)
      return
    }
    if (code && code !== 0) {
      console.error(`[dev:${label}] exit ${code}`)
      shutdown(code)
    }
  })
  return child
}

let vercel
let vite

function shutdown(code = 0) {
  for (const proc of [vercel, vite]) {
    if (proc && !proc.killed) proc.kill('SIGTERM')
  }
  setTimeout(() => process.exit(code), 100)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('Palto dev — API http://localhost:3000  |  front http://localhost:5173\n')

vercel = run(
  'api',
  'npx',
  ['vercel', 'dev', '--yes', '--listen', '3000', '--local-config', 'vercel.dev.json'],
  { VERCEL: '1' },
)

waitForPort(3000)
  .then(() => {
    console.log('\n[dev] API prête sur :3000 — démarrage Vite sur :5173\n')
    vite = run('vite', 'npm', ['run', 'dev'])
  })
  .catch((err) => {
    console.error('[dev]', err.message)
    shutdown(1)
  })

