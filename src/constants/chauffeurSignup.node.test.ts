import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseLicenseYear,
  validateSignupPlate,
  isValidSignupMotorisation,
} from './chauffeurSignup.ts'

describe('chauffeurSignup validation', () => {
  it('valide une plaque SIV', () => {
    const r = validateSignupPlate('ab 123 cd')
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.normalized, 'AB-123-CD')
  })

  it('rejette une plaque invalide', () => {
    assert.equal(validateSignupPlate('123').ok, false)
  })

  it('parse une année de permis valide', () => {
    const year = new Date().getFullYear()
    assert.equal(parseLicenseYear(String(year - 5)), year - 5)
  })

  it('rejette une année hors bornes', () => {
    assert.equal(parseLicenseYear('1800'), null)
    assert.equal(parseLicenseYear('abcd'), null)
  })

  it('reconnait la motorisation', () => {
    assert.equal(isValidSignupMotorisation('electrique_100'), true)
    assert.equal(isValidSignupMotorisation('diesel'), false)
  })
})
