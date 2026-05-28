import { useEffect, useState } from 'react'

const BETA_BANNER_DISMISSED_KEY = 'palto_beta_banner_dismissed_v1'

export default function BetaTestBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(BETA_BANNER_DISMISSED_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed) return null

  return (
    <>
      <div className="beta-test-banner" role="region" aria-label="Information beta test Palto">
        <div className="beta-test-banner__content">
          <p>
            Version beta test v0.0.1 - Votre avis compte. <strong>Nou la fé</strong>.
          </p>
          <button
            type="button"
            className="beta-test-banner__cta"
            onClick={() => setModalOpen(true)}
          >
            En savoir plus
          </button>
        </div>
        <button
          type="button"
          className="beta-test-banner__close"
          aria-label="Fermer le bandeau"
          onClick={() => {
            setDismissed(true)
            try {
              localStorage.setItem(BETA_BANNER_DISMISSED_KEY, '1')
            } catch {
              /* ignore */
            }
          }}
        >
          ×
        </button>
      </div>

      {modalOpen ? (
        <div className="beta-test-modal-backdrop" role="presentation" onClick={() => setModalOpen(false)}>
          <div
            className="beta-test-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="beta-test-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="beta-test-modal-title">Palto beta test v0.0.1</h2>
            <p>
              La Reunion vit aujourd hui de gros bouchons, et Palto intervient pour faciliter l acces au taxi moto,
              afin que vous puissiez arriver en temps et en heure.
            </p>
            <p>
              Pendant cette phase beta, les paiements in-app arrivent bientot : pour le moment, le reglement se fait
              uniquement en especes aupres des chauffeurs.
            </p>
            <p>
              Vous pouvez rencontrer certains dysfonctionnements pendant les tests. Vos retours nous aident directement
              a ameliorer la future version de Palto.
            </p>
            <p>
              Merci pour votre confiance et votre utilisation de Palto. <strong>Nou la fé</strong>.
            </p>
            <button type="button" className="beta-test-modal__close" onClick={() => setModalOpen(false)}>
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
