/** Aligné sur server/lib/stripeConfig.ts (affichage front). */
export const PALTO_PLATFORM_FEE_EUR = 2
export const CLIENT_CANCELLATION_FEE_EUR = 5

export function formatRideTotalWithPaltoFee(driverAmountEur: number): {
  driverEur: number
  paltoFeeEur: number
  totalEur: number
} {
  const driver = Math.max(0, Math.round(driverAmountEur * 100) / 100)
  const palto = PALTO_PLATFORM_FEE_EUR
  return {
    driverEur: driver,
    paltoFeeEur: palto,
    totalEur: Math.round((driver + palto) * 100) / 100,
  }
}
