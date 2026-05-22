import { Phone } from 'lucide-react';
import type { ClientDriverDisplay } from '../lib/clientDriverDisplay';
import './ClientDriverMeetCard.css';

function driverInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export type ClientDriverMeetCardProps = ClientDriverDisplay & {
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Préfixe classes : suivi carte ou flux compte. */
  variant?: 'tracking' | 'compte';
  className?: string;
  'data-driver-card-version'?: string;
};

export default function ClientDriverMeetCard({
  driverName,
  driverPhone,
  driverProfilePhotoUrl,
  licensePlate,
  vehicleColor,
  vehicleLine,
  t,
  variant = 'compte',
  className = '',
  'data-driver-card-version': dataDriverCardVersion,
}: ClientDriverMeetCardProps) {
  const rootClass = [
    'client-driver-meet-card',
    variant === 'tracking' ? 'client-driver-meet-card--tracking' : 'client-driver-meet-card--compte',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const telHref = driverPhone ? `tel:${driverPhone.replace(/\s/g, '')}` : null;

  return (
    <div
      className={rootClass}
      aria-label={t('clientAccount.rideMeetDriverCardAria')}
      data-driver-card-version={dataDriverCardVersion}
    >
      {driverProfilePhotoUrl ? (
        <img src={driverProfilePhotoUrl} alt="" className="client-driver-meet-card__avatar client-driver-meet-card__avatar--photo" />
      ) : (
        <div className="client-driver-meet-card__avatar" aria-hidden>
          {driverInitials(driverName)}
        </div>
      )}
      <div className="client-driver-meet-card__body">
        <p className="client-driver-meet-card__name">{driverName}</p>
        {vehicleLine ? <p className="client-driver-meet-card__vehicle">{vehicleLine}</p> : null}
        {vehicleColor ? (
          <p className="client-driver-meet-card__meta">
            {t('clientAccount.rideMeetVehicleColor')} {vehicleColor}
          </p>
        ) : null}
        {licensePlate ? <p className="client-driver-meet-card__plate">{licensePlate}</p> : null}
        {driverPhone ? (
          <p className="client-driver-meet-card__phone">
            <span className="client-driver-meet-card__phone-label">{t('clientAccount.rideMeetDriverPhone')}</span>
            {telHref ? (
              <a href={telHref} className="client-driver-meet-card__phone-link">
                {driverPhone}
              </a>
            ) : (
              <span>{driverPhone}</span>
            )}
          </p>
        ) : null}
      </div>
      {telHref ? (
        <a
          href={telHref}
          className="client-driver-meet-card__call"
          aria-label={t('clientAccount.rideMeetCall')}
          title={t('clientAccount.rideMeetCall')}
        >
          <Phone size={18} aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
