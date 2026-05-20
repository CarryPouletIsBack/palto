#!/usr/bin/env node
/**
 * Réinitialise le mot de passe d’un compte Palto (app_accounts).
 * Usage: npm run reset-password -- client pauzatnathan980@gmail.com MonNouveauMotDePasse
 *        npm run reset-password -- chauffeur pauzatoceane@gmail.com MonNouveauMotDePasse
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { randomBytes, scryptSync } from 'crypto'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[t.slice(0, i)] = val
  }
  return out
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${derived}`
}

const root = resolve(import.meta.dirname, '..')
const env = { ...loadEnvFile(resolve(root, '.env')), ...loadEnvFile(resolve(root, '.env.local')), ...process.env }

const [, , roleRaw, emailRaw, password] = process.argv
const role = roleRaw === 'client' || roleRaw === 'chauffeur' ? roleRaw : null
const email = emailRaw?.trim().toLowerCase()

if (!role || !email || !password || password.length < 6) {
  console.error('Usage: npm run reset-password -- <client|chauffeur> <email> <mot_de_passe_min_6>')
  process.exit(1)
}

const url = env.SUPABASE_URL?.trim()
const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!url || !key) {
  console.error('Manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const password_hash = hashPassword(password)

const { data, error } = await supabase
  .from('app_accounts')
  .update({ password_hash, updated_at: new Date().toISOString() })
  .eq('email', email)
  .eq('role', role)
  .select('id,email,role')
  .maybeSingle()

if (error) {
  console.error('Erreur Supabase:', error.message)
  process.exit(1)
}
if (!data) {
  console.error(`Aucun compte ${role} pour ${email}`)
  process.exit(1)
}

console.log(`OK — mot de passe mis à jour pour ${data.role} ${data.email} (${data.id})`)
