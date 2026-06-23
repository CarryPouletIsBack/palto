import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  required?: boolean
}

export function AuthFieldLabelText({ children, required = false }: Props) {
  return (
    <span className="auth-page-field-label-text">
      {children}
      {required ? <span className="auth-page-field-required" aria-hidden="true"> *</span> : null}
    </span>
  )
}
