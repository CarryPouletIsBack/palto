import { z } from 'zod'

export const AccountRegistrationIdentitySchema = z.object({
  prenom: z.string().trim().min(1, 'Prenom requis').max(80),
  nom: z.string().trim().min(1, 'Nom requis').max(80),
  phone: z.string().trim().min(6, 'Telephone requis').max(40),
})

export type AccountRegistrationIdentity = z.infer<typeof AccountRegistrationIdentitySchema>

export function buildAccountFullName(prenom: string, nom: string): string {
  return `${prenom.trim()} ${nom.trim()}`.trim()
}

export function normalizeRegistrationPhone(phone: string): string {
  return phone.replace(/\s+/g, ' ').trim()
}

export function registrationDisplayName(prenom: string, nom: string, email: string): string {
  const full = buildAccountFullName(prenom, nom)
  if (full) return full
  return email.split('@')[0] || 'Compte Palto'
}
