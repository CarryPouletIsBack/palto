#!/usr/bin/env node
/**
 * Vérifie que les variables Supabase sont présentes (local ou CI).
 * Usage: node scripts/check-supabase-env.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const envFiles = ['.env.local', '.env']

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
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
  return out
}

const merged = {}
for (const f of envFiles) {
  Object.assign(merged, loadEnvFile(resolve(root, f)))
}
Object.assign(merged, process.env)

const requiredServer = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const requiredClient = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
let ok = true

console.log('--- Supabase env check (Palto) ---\n')

for (const key of requiredServer) {
  const v = (merged[key] ?? '').trim()
  if (!v) {
    console.log(`✗ ${key} — manquant (obligatoire pour /api/* en local avec vercel dev)`)
    ok = false
  } else {
    console.log(`✓ ${key} — défini (${v.length} caractères)`)
  }
}

for (const key of requiredClient) {
  const v = (merged[key] ?? '').trim()
  if (!v) {
    console.log(`○ ${key} — manquant (Realtime navigateur désactivé)`)
  } else {
    console.log(`✓ ${key} — défini`)
  }
}

const url = (merged.SUPABASE_URL ?? merged.VITE_SUPABASE_URL ?? '').trim()
if (url && !url.includes('supabase.co')) {
  console.log('\n⚠ URL Supabase inattendue:', url)
}

console.log('\nProjet attendu: https://uzjplpdpbxvzhisxgwfz.supabase.co')
console.log('Guide: docs/SUPABASE-CONNEXION.md')

if (!ok) {
  process.exit(1)
}

console.log('\nOK — tu peux lancer: npm run dev:api')
