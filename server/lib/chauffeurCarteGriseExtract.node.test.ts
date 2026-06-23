import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractVehicleFromCarteGrise } from './chauffeurCarteGriseExtract.js'

describe('extractVehicleFromCarteGrise', () => {
  it('extrait marque, modèle, genre et énergie', () => {
    const text = `
      CERTIFICAT D IMMATRICULATION
      MARQUE PEUGEOT
      MODELE 308
      GENRE VP
      ENERGIE EL
      AA-123-BB
    `
    const result = extractVehicleFromCarteGrise(text)
    assert.equal(result.brand, 'Peugeot')
    assert.equal(result.model, '308')
    assert.equal(result.label, 'Peugeot 308')
    assert.equal(result.vehicleTypeSlug, 'berline')
    assert.equal(result.motorisation, 'electrique_100')
  })

  it('reconnait un utilitaire', () => {
    const result = extractVehicleFromCarteGrise('MARQUE RENAULT MODELE KANGOO GENRE CTTE ENERGIE ES')
    assert.equal(result.vehicleTypeSlug, 'utilitaire')
    assert.equal(result.motorisation, 'thermique_hydrogene_hybride')
  })
})
