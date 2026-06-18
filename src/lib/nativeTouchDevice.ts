/** Appareil tactile natif (iOS / Android) — pas le redimensionnement d’un navigateur desktop. */
export function isNativeTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches
}

export function markNativeTouchOnDocument(): void {
  if (typeof document === 'undefined') return
  if (!isNativeTouchDevice()) return
  document.documentElement.setAttribute('data-native-touch', 'true')
}
