import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  estimateChauffeurFareTtc,
  normalizeRidePricing,
  parseRidePricingFromSnapshot,
  vehicleCoefFromLabel,
} from './chauffeurFareEstimate.ts'

describe('chauffeurFareEstimate', () => {
  it('applique forfait + km avec défauts', () => {
    const ttc = estimateChauffeurFareTtc({
      routeKm: 10,
      elevationM: 0,
      isNight: false,
      vehicleLabel: 'Moto',
    })
    assert.ok(ttc != null && ttc >= 6)
    const grid = normalizeRidePricing(null)
    const expected =
      (grid.baseFareEur + 10 * grid.pricePerKmEur) * grid.pricingMultiplier * vehicleCoefFromLabel('Moto')
    assert.equal(ttc, Math.round(Math.max(6, expected) * 100) / 100)
  })

  it('respecte le multiplicateur 110 %', () => {
    const base = estimateChauffeurFareTtc({
      ridePricing: { baseFareEur: '2', pricePerKmEur: '1', pricingMultiplierPercent: 100 },
      routeKm: 5,
      elevationM: 0,
      vehicleLabel: 'Moto',
    })
    const premium = estimateChauffeurFareTtc({
      ridePricing: { baseFareEur: '2', pricePerKmEur: '1', pricingMultiplierPercent: 110 },
      routeKm: 5,
      elevationM: 0,
      vehicleLabel: 'Moto',
    })
    assert.ok(base != null && premium != null)
    assert.ok(premium > base)
  })

  it('applique le bonus nuit', () => {
    const day = estimateChauffeurFareTtc({
      ridePricing: { baseFareEur: '2', pricePerKmEur: '1', nightSurchargePercent: '20' },
      routeKm: 8,
      elevationM: 0,
      isNight: false,
      vehicleLabel: 'Moto',
    })
    const night = estimateChauffeurFareTtc({
      ridePricing: { baseFareEur: '2', pricePerKmEur: '1', nightSurchargePercent: '20' },
      routeKm: 8,
      elevationM: 0,
      isNight: true,
      vehicleLabel: 'Moto',
    })
    assert.ok(day != null && night != null)
    assert.ok(night > day)
  })

  it('deux grilles chauffeur donnent des montants différents', () => {
    const a = estimateChauffeurFareTtc({
      ridePricing: { baseFareEur: '2', pricePerKmEur: '1' },
      routeKm: 12,
      elevationM: 0,
      vehicleLabel: 'Moto',
    })
    const b = estimateChauffeurFareTtc({
      ridePricing: { baseFareEur: '5', pricePerKmEur: '2' },
      routeKm: 12,
      elevationM: 0,
      vehicleLabel: 'Moto',
    })
    assert.ok(a != null && b != null)
    assert.notEqual(a, b)
  })

  it('parse ridePricing depuis account_snapshot', () => {
    const parsed = parseRidePricingFromSnapshot({
      prenom: 'Jean',
      ridePricing: { baseFareEur: '3,50', pricePerKmEur: '1,80' },
    })
    assert.equal(parsed?.baseFareEur, '3,50')
    assert.equal(parsed?.pricePerKmEur, '1,80')
  })
})
