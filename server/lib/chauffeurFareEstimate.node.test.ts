import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseRidePricingFromSnapshot } from './chauffeurFareEstimate.ts'

describe('chauffeurFareEstimate (server)', () => {
  it('extrait ridePricing du snapshot profil', () => {
    const pricing = parseRidePricingFromSnapshot({
      ridePricing: {
        baseFareEur: '4',
        pricePerKmEur: '1.2',
        pricingMultiplierPercent: 95,
      },
    })
    assert.equal(pricing?.baseFareEur, '4')
    assert.equal(pricing?.pricingMultiplierPercent, 95)
  })
})
