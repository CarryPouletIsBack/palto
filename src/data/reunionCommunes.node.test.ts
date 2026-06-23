import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractReunionCommuneFromAddressLabel } from './reunionCommunes.ts'

describe('extractReunionCommuneFromAddressLabel', () => {
  it('extrait la commune après le code postal 97xxx', () => {
    assert.equal(
      extractReunionCommuneFromAddressLabel('10 Rue Leconte de Lisle 97400 Saint-Denis'),
      'Saint-Denis'
    )
    assert.equal(extractReunionCommuneFromAddressLabel('Chemin des Cascades 97436 Saint-Leu'), 'Saint-Leu')
  })

  it('reconnaît une commune dans le libellé sans code postal', () => {
    assert.equal(extractReunionCommuneFromAddressLabel('Rue de la Gare, Saint-Pierre'), 'Saint-Pierre')
    assert.equal(extractReunionCommuneFromAddressLabel('Les Trois-Bassins centre'), 'Les Trois-Bassins')
  })

  it('retourne une chaîne vide si aucune commune connue', () => {
    assert.equal(extractReunionCommuneFromAddressLabel('Rue inconnue'), '')
  })
})
