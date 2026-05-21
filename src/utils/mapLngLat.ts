/** Point affichable sur la carte (WGS84). */
export function isValidMapLngLat(
  p: { longitude: number; latitude: number } | null | undefined
): p is { longitude: number; latitude: number } {
  return (
    p != null &&
    Number.isFinite(p.longitude) &&
    Number.isFinite(p.latitude)
  )
}
