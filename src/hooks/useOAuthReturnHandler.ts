import { useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import {
  completeOAuthExchange,
  oauthErrorMessage,
  stripOAuthQueryParams,
} from '../services/oauthAuthService'
import type { AccountRole } from '../services/authService'

type UseOAuthReturnHandlerOptions = {
  onSuccess: (role: AccountRole) => void
}

/** Finalise le retour OAuth (`?oauth_exchange=…`) une fois par chargement. */
export function useOAuthReturnHandler({ onSuccess }: UseOAuthReturnHandlerOptions): void {
  const { t } = useLanguage()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return

    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('oauth_error')
    if (oauthError) {
      handledRef.current = true
      const message = oauthErrorMessage(oauthError, t)
      if (message) window.alert(message)
      stripOAuthQueryParams()
      return
    }

    const exchange = params.get('oauth_exchange')
    const role = params.get('oauth_role')
    if (!exchange || (role !== 'client' && role !== 'chauffeur')) return

    handledRef.current = true
    void completeOAuthExchange(exchange, role).then((result) => {
      stripOAuthQueryParams()
      if (!result.success) {
        window.alert(result.error ?? t('authOAuth.errorGeneric'))
        return
      }
      onSuccess(role)
    })
  }, [onSuccess, t])
}
