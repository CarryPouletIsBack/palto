#!/usr/bin/env node
/**
 * Dev local Palto : Vite (:5173) + routes /api Vercel (:3000).
 * Évite le conflit quand Vite et Vercel partagent le même port.
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Charge .env.local puis .env (même logique que check-supabase-env.mjs). */
function loadEnvFiles() {
  const out = {}
  for (const name of ['.env.local', '.env']) {
    const filePath = path.join(root, name)
    if (!existsSync(filePath)) continue
    for (const line of readFileSync(filePath, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 1) continue
      const key = t.slice(0, i)
      let val = t.slice(i + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      out[key] = val
    }
  }
  return out
}

const fileEnv = loadEnvFiles()
const devEnv = { ...process.env, ...fileEnv, VERCEL: '1' }

if (!devEnv.SUPABASE_URL?.trim() || !devEnv.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
  console.warn(
    '\n⚠️  SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant — /api/auth renverra 503.\n' +
      '   Copie .env.example → .env.local et relance npm run dev:api\n' +
      '   Vérif : npm run check:supabase\n',
  )
}

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
  devEnv,
)

async function smokeTestApi() {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/auth?role=chauffeur&action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (res.status === 503) {
      console.error(
        '\n✗ L’API répond 503 (Supabase non configuré dans le process Vercel).\n' +
          '  → Vérifie .env.local puis relance npm run dev:api\n' +
          '  → npm run check:supabase\n',
      )
      return
    }
    console.log(`[dev] Smoke test API : HTTP ${res.status} (attendu 400, pas 503)\n`)
  } catch {
    /* vercel pas encore prêt pour fetch */
  }
}

waitForPort(3000)
  .then(() => smokeTestApi())
  .then(() => {
    console.log('[dev] API prête sur :3000 — démarrage Vite sur :5173\n')
    vite = run('vite', 'npm', ['run', 'dev'], devEnv)
  })
  .catch((err) => {
    console.error('[dev]', err.message)
    shutdown(1)
  })

