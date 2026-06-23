import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateChauffeurDocument } from './chauffeurDocumentValidation.js'

function padPdfBuffer(core: string): Buffer {
  const minBytes = 4_096
  let body = core
  while (Buffer.byteLength(body, 'utf8') < minBytes) {
    body += '\n% comment padding\n'
  }
  return Buffer.from(body, 'utf8')
}

function samplePermisPdf(): Buffer {
  const body = `%PDF-1.4
1 0 obj<<>>endobj
trailer<<>>
(PERMIS DE CONDUIRE)
(REPUBLIQUE FRANCAISE)
(CATEGORIE B)
(PLAQUE AA-123-BB)
(VALIDITE 12/08/2031)
%%EOF`
  return padPdfBuffer(body)
}

function sampleWrongPdf(): Buffer {
  return padPdfBuffer('%PDF-1.4\n(FACTURE TELEPHONE)\n(OPERATEUR MOBILE)\n%%EOF')
}

describe('validateChauffeurDocument', () => {
  it('valide un PDF permis cohérent', () => {
    const result = validateChauffeurDocument({
      docType: 'permis',
      fileName: 'permis.pdf',
      mimeType: 'application/pdf',
      buffer: samplePermisPdf(),
    })
    assert.equal(result.valid, true)
    assert.equal(result.status, 'ok')
    assert.ok(result.checks.some((c) => c.id === 'document_keywords' && c.ok))
  })

  it('rejette un PDF hors sujet', () => {
    const result = validateChauffeurDocument({
      docType: 'permis',
      fileName: 'facture.pdf',
      mimeType: 'application/pdf',
      buffer: sampleWrongPdf(),
    })
    assert.equal(result.valid, false)
    assert.equal(result.status, 'rejected')
  })

  it('vérifie la plaque sur une carte grise', () => {
    const buffer = padPdfBuffer(
      `%PDF-1.4
(CERTIFICAT D IMMATRICULATION)
(CARTE GRISE)
(MARQUE PEUGEOT)
(MODELE 308)
(GENRE VP)
(ENERGIE ES)
(AA-123-BB)
(EXPIRE LE 15/06/2028)
%%EOF`
    )
    const ok = validateChauffeurDocument({
      docType: 'carte-grise',
      fileName: 'cg.pdf',
      mimeType: 'application/pdf',
      buffer,
      expectedPlate: 'AA-123-BB',
    })
    assert.equal(ok.valid, true)
    assert.equal(ok.extractedVehicle?.label, 'Peugeot 308')
    assert.equal(ok.extractedVehicle?.vehicleTypeSlug, 'berline')

    const ko = validateChauffeurDocument({
      docType: 'carte-grise',
      fileName: 'cg.pdf',
      mimeType: 'application/pdf',
      buffer,
      expectedPlate: 'BB-999-ZZ',
    })
    assert.equal(ko.valid, false)
  })

  it('rejette une image JPEG pour validation auto', () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00])
    const buffer = Buffer.concat([jpegHeader, Buffer.alloc(25_000, 1)])
    const result = validateChauffeurDocument({
      docType: 'assurance',
      fileName: 'scan.jpg',
      mimeType: 'image/jpeg',
      buffer,
    })
    assert.equal(result.valid, false)
  })
})
