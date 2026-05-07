export function simplifyAddressDisplay(raw: string): string {
  const input = raw.trim()
  if (!input) return ''
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return input

  const cpPart = parts.find((p) => /\b97\d{3}\b/.test(p)) ?? ''
  const cityPart =
    parts.find((p) => /\bsaint\b|\ble\s+\w+|\bla\s+\w+|port|tampon|possession|etang|saline/i.test(p)) ??
    (parts.length > 1 ? parts[1] : '')
  const streetPart = parts[0]
  const cp = (cpPart.match(/\b97\d{3}\b/) ?? [])[0] ?? ''
  const city = cityPart.replace(/\b97\d{3}\b/g, '').replace(/\bla reunion\b/gi, '').trim()

  const compact = [streetPart, city, cp].filter(Boolean).join(', ')
  return compact || input
}
