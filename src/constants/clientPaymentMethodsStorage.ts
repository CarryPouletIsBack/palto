/** Cartes enregistrées côté compte passager (MVP local — pas encore Stripe Customer). */

export type ClientSavedPaymentMethod = {
  id: string
  brand: string
  last4: string
  cardholderName: string
  expiryMonth: string
  expiryYear: string
  billing: {
    country: string
    addressLine1: string
    city: string
    postalCode: string
  }
  createdAt: string
}

const STORAGE_KEY = 'palto_client_payment_methods_by_email_v1'

function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase()
}

function readMap(): Record<string, ClientSavedPaymentMethod[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ClientSavedPaymentMethod[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadClientPaymentMethods(email: string | null | undefined): ClientSavedPaymentMethod[] {
  const key = normalizeEmail(email)
  if (!key) return []
  return readMap()[key] ?? []
}

export function saveClientPaymentMethod(
  email: string | null | undefined,
  method: Omit<ClientSavedPaymentMethod, 'id' | 'createdAt'> & { id?: string }
): ClientSavedPaymentMethod[] {
  const key = normalizeEmail(email)
  if (!key) return []
  const map = readMap()
  const list = map[key] ?? []
  const entry: ClientSavedPaymentMethod = {
    id: method.id ?? `pm_${Date.now().toString(36)}`,
    brand: method.brand,
    last4: method.last4,
    cardholderName: method.cardholderName,
    expiryMonth: method.expiryMonth,
    expiryYear: method.expiryYear,
    billing: method.billing,
    createdAt: new Date().toISOString(),
  }
  const next = [entry, ...list.filter((m) => m.last4 !== entry.last4)]
  map[key] = next.slice(0, 5)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
  return map[key]
}
