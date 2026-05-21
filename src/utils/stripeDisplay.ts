import type { ClientStripePaymentMethodBilling } from '../services/clientStripeApi'

export function formatStripeCardBrand(brand: string): string {
  const b = brand.toLowerCase()
  if (b === 'visa') return 'Visa'
  if (b === 'mastercard') return 'Mastercard'
  if (b === 'amex') return 'American Express'
  return brand.charAt(0).toUpperCase() + brand.slice(1)
}

export function formatStripeBillingLines(
  billing: ClientStripePaymentMethodBilling | null | undefined
): string[] {
  if (!billing?.line1) return []
  const lines: string[] = [billing.line1]
  if (billing.line2?.trim()) lines.push(billing.line2.trim())
  const cityLine = [billing.postalCode, billing.city].filter(Boolean).join(' ').trim()
  if (cityLine) lines.push(cityLine)
  if (billing.country?.trim()) lines.push(billing.country.trim())
  return lines
}
