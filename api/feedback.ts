import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const BodySchema = z.object({
  rating: z.number().int().min(0).max(10),
  message: z.string().trim().min(3).max(1200),
  page: z.string().trim().max(200).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL?.trim()
  if (!webhookUrl) {
    return res.status(503).json({ error: 'Webhook Discord non configuré' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Payload invalide' })
  }

  const { rating, message, page } = parsed.data
  const text = [
    'Nouveau retour beta Palto',
    `Note: ${rating}/10`,
    `Page: ${page || 'inconnue'}`,
    '',
    message,
  ].join('\n')

  try {
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    if (!discordRes.ok) {
      const detail = await discordRes.text().catch(() => '')
      console.error('[feedback] discord webhook', discordRes.status, detail)
      return res.status(502).json({ error: 'Envoi Discord impossible' })
    }
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[feedback] network', error)
    return res.status(502).json({ error: 'Envoi Discord impossible' })
  }
}
