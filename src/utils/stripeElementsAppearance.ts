import type { Appearance } from '@stripe/stripe-js'

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** Apparence Payment Element alignée sur les tokens Go (--sp-*). */
export function paltoStripeElementsAppearance(): Appearance {
  const isDark = typeof document !== 'undefined' && document.documentElement.dataset.appTheme === 'dark'
  const primary = '#ff8c42'
  const background = cssVar('--sp-card-surface', isDark ? '#232d3f' : '#ffffff')
  const text = cssVar('--sp-text', isDark ? '#f1f5f9' : '#1f2937')
  const subtle = cssVar('--sp-text-subtle', isDark ? '#94a3b8' : '#64748b')
  const border = cssVar('--sp-edge-medium', isDark ? '#3d4f66' : '#d7dee8')

  return {
    theme: isDark ? 'night' : 'stripe',
    variables: {
      colorPrimary: primary,
      colorBackground: background,
      colorText: text,
      colorTextSecondary: subtle,
      colorTextPlaceholder: subtle,
      colorDanger: '#dc2626',
      borderRadius: '10px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        border: `1px solid ${border}`,
        boxShadow: 'none',
      },
      '.Label': {
        fontWeight: '700',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      },
    },
  }
}
