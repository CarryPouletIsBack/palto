import type { VercelRequest, VercelResponse } from '@vercel/node'
import { expireStaleInstantPendingCourses } from '../../server/lib/expireStaleInstantPendingCourses.js'
import { getSupabaseAdmin } from '../../server/lib/supabaseAdmin.js'

/** Cron Vercel : cloture les courses instant pending > 6 min (meme regle que GET chauffeur/client). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = process.env.CRON_SECRET?.trim()
  if (secret) {
    const auth = req.headers.authorization?.trim() ?? ''
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Non autorise' })
    }
  }

  try {
    const supabase = getSupabaseAdmin()
    const result = await expireStaleInstantPendingCourses(supabase)
    return res.status(200).json({ ok: true, ...result })
  } catch (e) {
    console.error('[cron/expire-instant-pending]', e)
    return res.status(500).json({ error: 'Expiration impossible' })
  }
}
