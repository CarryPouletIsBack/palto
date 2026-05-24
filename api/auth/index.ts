import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  handleAuthChauffeurLogin,
  handleAuthChauffeurRegister,
  handleAuthClientLogin,
  handleAuthClientRegister,
  handleAuthDeleteAccount,
  handleAuthRealtimeToken,
} from '../../server/lib/authApiHandlers.js'

/**
 * Route auth unique (limite Hobby : 12 Serverless Functions max).
 * ?role=client|chauffeur&action=login|register  (POST)
 * ?action=realtime-token  (GET)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const actionRaw = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action
  const roleRaw = Array.isArray(req.query.role) ? req.query.role[0] : req.query.role
  const action = typeof actionRaw === 'string' ? actionRaw.trim().toLowerCase() : ''
  const role = typeof roleRaw === 'string' ? roleRaw.trim().toLowerCase() : ''

  if (action === 'realtime-token') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    return handleAuthRealtimeToken(req, res)
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (role === 'client' && action === 'login') return handleAuthClientLogin(req, res)
  if (role === 'client' && action === 'register') return handleAuthClientRegister(req, res)
  if (role === 'chauffeur' && action === 'login') return handleAuthChauffeurLogin(req, res)
  if (role === 'chauffeur' && action === 'register') return handleAuthChauffeurRegister(req, res)
  if (role === 'client' && action === 'delete') return handleAuthDeleteAccount(req, res, 'client')
  if (role === 'chauffeur' && action === 'delete') return handleAuthDeleteAccount(req, res, 'chauffeur')

  return res.status(400).json({ error: 'Parametres role et action invalides' })
}
