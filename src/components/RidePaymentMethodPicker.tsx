import { useLanguage } from '../contexts/LanguageContext'

export type RidePaymentMethod = 'card' | 'cash'

type RidePaymentMethodPickerProps = {
  value: RidePaymentMethod
  onChange: (value: RidePaymentMethod) => void
  cardAvailable?: boolean
}

export default function RidePaymentMethodPicker({
  value,
  onChange,
  cardAvailable = true,
}: RidePaymentMethodPickerProps) {
  const { t } = useLanguage()

  return (
    <div className="palto-checkout__field">
      <span>{t('search.checkoutPaymentMethodLabel')}</span>
      <div
        className="palto-checkout__payments"
        role="group"
        aria-label={t('search.checkoutPaymentMethodLabel')}
      >
        {cardAvailable ? (
          <button
            type="button"
            className={
              'palto-checkout__payment' + (value === 'card' ? ' palto-checkout__payment--active' : '')
            }
            aria-pressed={value === 'card'}
            onClick={() => onChange('card')}
          >
            {t('search.checkoutPaymentCard')}
          </button>
        ) : null}
        <button
          type="button"
          className={
            'palto-checkout__payment' + (value === 'cash' ? ' palto-checkout__payment--active' : '')
          }
          aria-pressed={value === 'cash'}
          onClick={() => onChange('cash')}
        >
          {t('search.checkoutPaymentCash')}
        </button>
      </div>
      {!cardAvailable || value === 'cash' ? (
        <p className="palto-checkout__lead palto-checkout__payment-hint">
          {t('search.checkoutPaymentCashHint')}
        </p>
      ) : (
        <p className="palto-checkout__lead palto-checkout__payment-hint">
          {t('search.checkoutPaymentCardHint')}
        </p>
      )}
    </div>
  )
}
