import { useEffect, useRef, useState } from 'react'
import { apiBaseUrl } from '../constants/featureFlags'

const BETA_BANNER_DISMISSED_KEY = 'palto_beta_banner_dismissed_v1'

export default function BetaTestBanner() {
  const apiBase = apiBaseUrl()
  const bannerRef = useRef<HTMLDivElement | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [rating, setRating] = useState(8)
  const [feedback, setFeedback] = useState('')
  const [sending, setSending] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(BETA_BANNER_DISMISSED_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const applyHeight = () => {
      if (!bannerRef.current || dismissed) {
        root.style.setProperty('--beta-banner-height', '0px')
        return
      }
      root.style.setProperty('--beta-banner-height', `${bannerRef.current.offsetHeight}px`)
    }

    applyHeight()
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => applyHeight())
        : null
    if (observer && bannerRef.current) observer.observe(bannerRef.current)
    window.addEventListener('resize', applyHeight)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', applyHeight)
      root.style.setProperty('--beta-banner-height', '0px')
    }
  }, [dismissed])

  if (dismissed) return null

  return (
    <>
      <div ref={bannerRef} className="beta-test-banner" role="region" aria-label="Information beta test Palto">
        <div className="beta-test-banner__content">
          <p>
            Version bêta test v0.0.1 - Votre avis compte. <strong>Nou la fé</strong>.
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
              La Réunion vit aujourd'hui de gros bouchons, et Palto intervient pour faciliter l'accès au taxi moto,
              afin que vous puissiez arriver en temps et en heure.
            </p>
            <p>
              Pendant cette phase bêta, le paiement par carte arrive bientôt : pour le moment, le règlement se fait
              uniquement en espèces auprès des chauffeurs.
            </p>
            <p>
              Vous pouvez rencontrer certains dysfonctionnements pendant les tests. Vos retours nous aident
              directement à améliorer la future version de Palto.
            </p>
            <p>
              Merci pour votre confiance et votre utilisation de Palto. <strong>Nou la fé</strong>.
            </p>
            <div className="beta-test-feedback">
              <h3>Votre retour</h3>
              <label className="beta-test-feedback__label">
                Note sur 10
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={rating}
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    if (Number.isNaN(value)) return
                    setRating(Math.min(10, Math.max(0, Math.round(value))))
                  }}
                />
              </label>
              <label className="beta-test-feedback__label">
                Votre message
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Dites-nous ce qui marche bien et ce qu'on doit améliorer..."
                  rows={4}
                />
              </label>
              {feedbackStatus ? <p className="beta-test-feedback__status">{feedbackStatus}</p> : null}
              <button
                type="button"
                className="beta-test-feedback__send"
                disabled={sending || feedback.trim().length < 3}
                onClick={async () => {
                  setFeedbackStatus(null)
                  setSending(true)
                  try {
                    const response = await fetch(`${apiBase}/feedback`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        rating,
                        message: feedback.trim(),
                        page: typeof window !== 'undefined' ? window.location.pathname : '',
                      }),
                    })
                    const data = (await response.json().catch(() => null)) as { error?: string } | null
                    if (!response.ok) {
                      setFeedbackStatus(data?.error || 'Envoi impossible pour le moment.')
                      return
                    }
                    setFeedback('')
                    setRating(8)
                    setFeedbackStatus('Merci, votre retour a bien été envoyé.')
                  } catch {
                    setFeedbackStatus("Envoi impossible pour le moment, réessayez s'il vous plaît.")
                  } finally {
                    setSending(false)
                  }
                }}
              >
                {sending ? 'Envoi...' : 'Envoyer mon retour'}
              </button>
            </div>
            <button type="button" className="beta-test-modal__close" onClick={() => setModalOpen(false)}>
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
