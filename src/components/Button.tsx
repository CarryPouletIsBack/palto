import { type ReactNode } from 'react'
import './Button.css'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
  icon?: boolean
  iconSize?: 'small' | 'medium' | 'large'
  'aria-label'?: string
}

const Button = ({ 
  children, 
  variant = 'secondary', 
  onClick, 
  className = '', 
  type = 'button',
  icon = false,
  iconSize = 'medium',
  'aria-label': ariaLabel,
}: ButtonProps) => {
  return (
    <button 
      type={type}
      className={`btn btn-${variant} ${icon ? `btn-icon btn-icon-${iconSize}` : ''} ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

export default Button
