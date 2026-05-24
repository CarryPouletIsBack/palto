import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeVehicleSlugForSelect,
  chauffeurVehicleTypeLabel,
  isChauffeurVehicleType,
} from './chauffeurVehicleType.ts'

describe('chauffeurVehicleType', () => {
  it('reconnaît le slug moto', () => {
    assert.equal(isChauffeurVehicleType('moto'), true)
    assert.equal(normalizeVehicleSlugForSelect('moto'), 'moto')
    assert.equal(chauffeurVehicleTypeLabel('moto'), 'Moto')
  })

  it('convertit le libellé Berline en slug berline', () => {
    assert.equal(normalizeVehicleSlugForSelect('Berline'), 'berline')
  })

  it('retourne une chaîne vide pour une valeur inconnue', () => {
    assert.equal(normalizeVehicleSlugForSelect('camion'), '')
  })
})
