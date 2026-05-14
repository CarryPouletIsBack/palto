/**
 * Ouvre le menu natif d’un `<select>` (souvent via `showPicker()`), avec repli
 * si le navigateur ne l’expose pas. À appeler depuis un geste utilisateur.
 */
export function openNativeSelectPicker(select: HTMLSelectElement | null): void {
  if (!select) return
  const withPicker = select as HTMLSelectElement & { showPicker?: () => Promise<void> }
  if (typeof withPicker.showPicker === 'function') {
    void withPicker.showPicker.call(select).catch(() => {
      select.focus()
    })
    return
  }
  select.focus()
  try {
    select.click()
  } catch {
    /* ignore */
  }
}
