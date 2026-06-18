import { X } from 'lucide-react'

type AuthPageCloseButtonProps = {
  onClose: () => void
  ariaLabel: string
  overlayFixed?: boolean
}

export function AuthPageCloseButton({ onClose, ariaLabel, overlayFixed = false }: AuthPageCloseButtonProps) {
  return (
    <button
      type="button"
      className={'auth-page-close' + (overlayFixed ? ' auth-page-close--overlay-fixed' : '')}
      onClick={onClose}
      aria-label={ariaLabel}
    >
      <X size={24} aria-hidden />
    </button>
  )
}
