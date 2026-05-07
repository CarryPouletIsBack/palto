export function normalizeDriverExternalKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return v.length > 0 ? v : null
}

export function sameDriverExternalKey(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeDriverExternalKey(a)
  const nb = normalizeDriverExternalKey(b)
  return Boolean(na && nb && na === nb)
}

export function resolveRequestedDriverKeyForInsert(
  bookingKind: 'instant' | 'scheduled',
  requested: string | null | undefined
): string | null {
  if (bookingKind !== 'instant') return null
  return normalizeDriverExternalKey(requested)
}
