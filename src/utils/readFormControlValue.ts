import type { ChangeEvent, FormEvent } from 'react'

/** Valeur fiable depuis l’élément qui a le focus (évite `e.target` incorrect sur iOS / label). */
export function readFormControlValue(
  e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | FormEvent<HTMLInputElement>
): string {
  const el = e.currentTarget
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
    ? el.value
    : ''
}
