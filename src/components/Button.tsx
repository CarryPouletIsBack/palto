import { type ReactNode, type ButtonHTMLAttributes } from 'react'
import './Button.css'

interface ButtonProps
  extends Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'aria-label' | 'tabIndex' | 'aria-hidden' | 'disabled' | 'aria-busy'
  > {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
  icon?: boolean
  iconSize?: 'small' | 'medium' | 'large'
}

const Button = ({
  children,
  variant = 'secondary',
  onClick,
  className = '',
  type = 'button',
  icon = false,
  iconSize = 'medium',
  disabled,
  'aria-busy': ariaBusy,
  'aria-label': ariaLabel,
  tabIndex,
  'aria-hidden': ariaHidden,
}: ButtonProps) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${icon ? `btn-icon btn-icon-${iconSize}` : ''} ${className}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      aria-hidden={ariaHidden}
      disabled={disabled}
      aria-busy={ariaBusy}
    >
      {children}
    </button>
  )
}

export default Button
