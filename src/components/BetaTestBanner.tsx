import { useEffect, useRef, useState } from 'react'
import { apiBaseUrl } from '../constants/featureFlags'

const BETA_BANNER_DISMISSED_KEY = 'palto_beta_banner_dismissed_v1'

type BetaTestBannerProps = {
  placement?: 'top' | 'bottom'
  /** Bandeau empilé avec la topbar (pas de offset global --beta-banner-height). */
  inPageFlow?: boolean
}

export default function BetaTestBanner({ placement = 'top', inPageFlow = false }: BetaTestBannerProps) {
  const isBottom = placement === 'bottom'
  const showClose = !isBottom
  const apiBase = apiBaseUrl()
  const bannerRef = useRef<HTMLDivElement | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [rating, setRating] = useState(8)
  const [feedback, setFeedback] = useState('')
  const [sending, setSending] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null)

  useEffect(() => {
    if (isBottom) return
    try {
      setDismissed(localStorage.getItem(BETA_BANNER_DISMISSED_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [isBottom])

  useEffect(() => {
    if (placement !== 'top' || inPageFlow) return
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
  }, [dismissed, placement, inPageFlow])

  if (!isBottom && dismissed) return null

  return (
    <>
      <div
        ref={bannerRef}
        className={`beta-test-banner${isBottom ? ' beta-test-banner--bottom' : ''}${isBottom || inPageFlow ? ' beta-test-banner--inline' : ''}`}
        role="region"
        aria-label="Information beta test Palto"
      >
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
        {showClose ? (
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
        ) : null}
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
            <button
              type="button"
              className="beta-test-modal__icon-close"
              aria-label="Fermer la fenêtre"
              onClick={() => setModalOpen(false)}
            >
              ×
            </button>
            <h2 id="beta-test-modal-title">Palto beta test v0.0.1</h2>
            <p>
              Face aux embouteillages du quotidien à La Réunion, Palto se lance pour vous faire gagner du temps grâce
              aux taxis-motos. Notre mission : vous garantir des trajets rapides pour arriver à l'heure, à chaque
              course.
            </p>
            <p>
              Paiement durant la bêta : Le règlement par carte bancaire sera disponible très prochainement. Pour cette
              phase de test, le paiement s'effectue uniquement en espèces, directement auprès de votre chauffeur.
            </p>
            <p>
              Évolution du service : L'application est en cours de finalisation. Si vous rencontrez des bugs, vos
              retours sont précieux et nous aident à corriger le tir en direct.
            </p>
            <p>
              Merci de faire partie des premiers à tester l'aventure Palto. <strong>Nou la fé</strong> !
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
          </div>
        </div>
      ) : null}
    </>
  )
}
