import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * API Route Vercel pour l'envoi d'emails de contact (Resend)
 * POST /api/send
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY non configurée' });
  }

  const toEmail = process.env.RESEND_TO_EMAIL || 'merault.anthony@gmail.com';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Champs requis : name, email, message',
      });
    }

    const data = await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'Portfolio <onboarding@resend.dev>',
      to: [toEmail],
      subject: `Nouveau message de ${name}`,
      reply_to: email,
      text: message,
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error('[Contact API] Erreur:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur lors de l\'envoi',
    });
  }
}
