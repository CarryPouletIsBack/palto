import { useCallback, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

const TEST_CARD_DISPLAY = '4242 4242 4242 4242'
const TEST_CARD_RAW = '4242424242424242'

type Props = {
  className?: string
}

export default function PaltoStripeTestCardHint({ className = '' }: Props) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const copyCard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(TEST_CARD_RAW)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [])

  return (
    <aside
      className={`palto-checkout-test-hint ${className}`.trim()}
      aria-label={t('search.checkoutTestCardAria')}
    >
      <p className="palto-checkout-test-hint__title">{t('search.checkoutTestCardTitle')}</p>
      <p className="palto-checkout-test-hint__lead">{t('search.checkoutTestCardLead')}</p>
      <div className="palto-checkout-test-hint__row">
        <code className="palto-checkout-test-hint__code">{TEST_CARD_DISPLAY}</code>
        <button type="button" className="palto-checkout-test-hint__copy" onClick={() => void copyCard()}>
          {copied ? t('search.checkoutTestCardCopied') : t('search.checkoutTestCardCopy')}
        </button>
      </div>
      <ul className="palto-checkout-test-hint__meta">
        <li>{t('search.checkoutTestCardExpiry')}</li>
        <li>{t('search.checkoutTestCardCvc')}</li>
      </ul>
    </aside>
  )
}
