import { useState } from 'react';
import { Banknote, Clock, CreditCard, MapPinned, Star } from 'lucide-react';
import { trackEvent } from '../services/googleAnalyticsTracking';

export type ClientCompteRideEndCashProps = {
  priceEur: number;
  distanceKm: number;
  durationMin: number;
  driverName: string;
  route: string;
  paymentMethod?: 'card' | 'cash' | null;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export default function ClientCompteRideEndCash({
  priceEur,
  distanceKm,
  durationMin,
  driverName,
  route,
  paymentMethod,
  t,
}: ClientCompteRideEndCashProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isCard = paymentMethod === 'card';
  const canSubmit = rating >= 1 && !submitted;
  const amountFormatted = t('clientAccount.ridePriceEur', { n: priceEur });

  const submit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
    trackEvent('click', 'client_account', 'ride_end_review_submit', rating);
  };

  return (
    <div className="client-compte-ride-flow client-compte-ride-flow--end">
      <h5 className="client-compte-ride-flow__title">{t('clientAccount.rideEndTitle')}</h5>
      <p className="client-compte-ride-flow__lead">{t('clientAccount.rideEndLead', { route, driver: driverName })}</p>

      <div className="client-compte-ride-flow__stats" role="group" aria-label={t('clientAccount.rideEndStatsAria')}>
        <div className="client-compte-ride-flow__stat">
          <Banknote size={18} className="client-compte-ride-flow__stat-icon" aria-hidden />
          <span className="client-compte-ride-flow__stat-label">{t('clientAccount.ridePrice')}</span>
          <span className="client-compte-ride-flow__stat-value">{amountFormatted}</span>
        </div>
        <div className="client-compte-ride-flow__stat">
          <MapPinned size={18} className="client-compte-ride-flow__stat-icon" aria-hidden />
          <span className="client-compte-ride-flow__stat-label">{t('clientAccount.rideDistance')}</span>
          <span className="client-compte-ride-flow__stat-value">
            {t('clientAccount.rideDistanceKm', { n: distanceKm })}
          </span>
        </div>
        <div className="client-compte-ride-flow__stat">
          <Clock size={18} className="client-compte-ride-flow__stat-icon" aria-hidden />
          <span className="client-compte-ride-flow__stat-label">{t('clientAccount.rideDuration')}</span>
          <span className="client-compte-ride-flow__stat-value">
            {t('clientAccount.rideDurationMinutes', { n: durationMin })}
          </span>
        </div>
        <div className="client-compte-ride-flow__stat">
          {isCard ? (
            <CreditCard size={18} className="client-compte-ride-flow__stat-icon" aria-hidden />
          ) : (
            <Banknote size={18} className="client-compte-ride-flow__stat-icon" aria-hidden />
          )}
          <span className="client-compte-ride-flow__stat-label">{t('clientAccount.ridePayment')}</span>
          <span className="client-compte-ride-flow__stat-value">
            {isCard ? t('clientAccount.prefCard') : t('clientAccount.prefCash')}
          </span>
        </div>
      </div>

      <section
        className="client-compte-ride-flow__block"
        aria-labelledby={isCard ? 'ride-end-card-heading' : 'ride-end-cash-heading'}
      >
        <h6
          id={isCard ? 'ride-end-card-heading' : 'ride-end-cash-heading'}
          className="client-compte-ride-flow__block-title"
        >
          {isCard ? t('clientAccount.rideEndCardTitle') : t('clientAccount.rideEndCashTitle')}
        </h6>
        <p className="client-compte-ride-flow__hint">
          {isCard
            ? t('clientAccount.rideEndCardHint', { amount: amountFormatted })
            : t('clientAccount.rideEndCashHint')}
        </p>
      </section>

      <section className="client-compte-ride-flow__block" aria-labelledby="ride-end-review-heading">
        <h6 id="ride-end-review-heading" className="client-compte-ride-flow__block-title">
          {t('clientAccount.rideEndReviewTitle')}
        </h6>
        <p className="client-compte-ride-flow__hint">{t('clientAccount.rideEndReviewHint')}</p>
        <div className="client-compte-ride-flow__stars" role="group" aria-label={t('clientAccount.rideEndStarsAria')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`client-compte-ride-flow__star${rating >= n ? ' client-compte-ride-flow__star--on' : ''}`}
              aria-pressed={rating >= n}
              aria-label={t('clientAccount.rideEndStarLabel', { n })}
              onClick={() => setRating(n)}
              disabled={submitted}
            >
              <Star size={26} aria-hidden fill={rating >= n ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
        <label className="client-compte-ride-flow__comment-label" htmlFor="ride-end-review-comment">
          {t('clientAccount.rideEndCommentLabel')}
        </label>
        <textarea
          id="ride-end-review-comment"
          className="client-compte-ride-flow__comment"
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={submitted}
          placeholder={t('clientAccount.rideEndCommentPlaceholder')}
        />
        <button
          type="button"
          className="client-compte-ride-flow__btn client-compte-ride-flow__btn--primary client-compte-ride-flow__btn--full"
          disabled={!canSubmit}
          onClick={submit}
        >
          {t('clientAccount.rideEndSubmit')}
        </button>
      </section>

      {submitted ? (
        <p className="client-compte-ride-flow__toast" role="status">
          {t('clientAccount.rideEndThanks')}
        </p>
      ) : null}
    </div>
  );
}
