import type { MotorisationBarème } from '../services/baremeKilometriqueFiscal'
import { isValidFrenchPlate, normalizeFrenchPlate } from '../services/vehiclePlate'
import type { ChauffeurVehicleType } from './chauffeurRegistrationStorage'

export type ChauffeurSignupMotorisation = MotorisationBarème

export const CHAUFFEUR_SIGNUP_MOTORISATIONS: ChauffeurSignupMotorisation[] = [
  'thermique_hydrogene_hybride',
  'electrique_100',
]

export type ChauffeurSignupDraft = {
  prenom: string
  nom: string
  adresse: string
  ville: string
  email: string
  phoneCountry: 'FR' | 'RE'
  phoneNational: string
  password: string
  passwordConfirm: string
  vehicleType: ChauffeurVehicleType
  motorisation: ChauffeurSignupMotorisation
  plaque: string
  licenseYear: string
  isVtc: boolean
  deliveryEquipped: boolean
}

export const EMPTY_CHAUFFEUR_SIGNUP_DRAFT: ChauffeurSignupDraft = {
  prenom: '',
  nom: '',
  adresse: '',
  ville: '',
  email: '',
  phoneCountry: 'RE',
  phoneNational: '',
  password: '',
  passwordConfirm: '',
  vehicleType: 'berline',
  motorisation: 'thermique_hydrogene_hybride',
  plaque: '',
  licenseYear: '',
  isVtc: false,
  deliveryEquipped: false,
}

const LICENSE_YEAR_MIN = 1970

export function parseLicenseYear(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d{4}$/.test(trimmed)) return null
  const year = Number.parseInt(trimmed, 10)
  const max = new Date().getFullYear()
  if (!Number.isFinite(year) || year < LICENSE_YEAR_MIN || year > max) return null
  return year
}

export function isValidSignupMotorisation(value: string): value is ChauffeurSignupMotorisation {
  return CHAUFFEUR_SIGNUP_MOTORISATIONS.includes(value as ChauffeurSignupMotorisation)
}

function toSivPlateFormat(normalized: string): string {
  const compact = normalized.replace(/-/g, '')
  if (/^[A-HJ-NPR-TV-Z]{2}\d{3}[A-HJ-NPR-TV-Z]{2}$/.test(compact)) {
    return `${compact.slice(0, 2)}-${compact.slice(2, 5)}-${compact.slice(5, 7)}`
  }
  return normalized
}

export function validateSignupPlate(raw: string): { ok: true; normalized: string } | { ok: false } {
  const normalized = toSivPlateFormat(normalizeFrenchPlate(raw))
  if (!isValidFrenchPlate(normalized)) return { ok: false }
  return { ok: true, normalized }
}
