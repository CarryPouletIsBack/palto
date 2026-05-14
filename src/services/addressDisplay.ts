export function simplifyAddressDisplay(raw: string): string {
  const input = raw.trim()
  if (!input) return ''
  // Libellés de secours carte / hors adresse postale : ne pas « compacter » (sinon "port" dans "Départ", "la carte", etc.)
  if (
    !/\b97\d{3}\b/.test(input) &&
    /sélectionné sur la carte|selected on the map|Location from map|Lieu indiqué sur la carte/i.test(input)
  ) {
    return input
  }
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const uniqueParts: string[] = []
  const seen = new Set<string>()
  const normalizeNoPostal = (value: string) => normalize(value).replace(/\b97\d{3}\b/g, '').trim()
  for (const part of parts) {
    const key = normalizeNoPostal(part)
    if (!key || seen.has(key)) continue
    seen.add(key)
    uniqueParts.push(part)
  }
  const effectivePartsRaw = uniqueParts.length > 0 ? uniqueParts : parts
  // Déduplication « floue » : supprime les segments qui sont des variantes longues/courtes
  // d'un segment déjà vu (ex: "X 97420 Le Port" vs "X Le Port").
  const effectiveParts = effectivePartsRaw.filter((part, index) => {
    const current = normalizeNoPostal(part)
    return !effectivePartsRaw.slice(0, index).some((prev) => {
      const previous = normalizeNoPostal(prev)
      return previous === current || previous.includes(current) || current.includes(previous)
    })
  })
  if (effectiveParts.length === 0) return input

  const cpPart = effectiveParts.find((p) => /\b97\d{3}\b/.test(p)) ?? ''
  const cityPart =
    effectiveParts.find((p) =>
      /\bsaint\b|\ble\s+\w+|\bla\s+\w{6,}|\bport\b|tampon|possession|etang|saline/i.test(p)
    ) ?? (effectiveParts.length > 1 ? effectiveParts[1] : '')
  const streetPart = effectiveParts[0]
  const cp = (cpPart.match(/\b97\d{3}\b/) ?? [])[0] ?? ''
  const city = cityPart.replace(/\b97\d{3}\b/g, '').replace(/\bla reunion\b/gi, '').trim()

  // Si le premier segment contient déjà "numéro/voie + CP + ville", on le garde tel quel
  // pour éviter les doublons du type "..., Le Port, 97420".
  if (/\b97\d{3}\b/.test(streetPart) && /\bsaint\b|\ble\s+\w+|\bla\s+\w{6,}|\bport\b|tampon|possession|etang|saline/i.test(streetPart)) {
    return streetPart.replace(/\s+/g, ' ').trim()
  }

  const compact = [streetPart, city, cp].filter(Boolean).join(', ')
  return compact || input
}
