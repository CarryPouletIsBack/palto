const VEHICLE_LABELS: Record<string, string> = {
  berline: 'Berline',
  utilitaire: 'Utilitaire',
  moto: 'Moto',
  scooter: 'Scooter',
}

/** Libellé affiché pour `app_accounts.vehicle_type`. */
export function vehicleTypeLabel(vehicleType: string | null | undefined): string {
  const key = (vehicleType ?? '').trim().toLowerCase()
  if (!key) return 'Moto'
  return VEHICLE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}
