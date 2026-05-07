import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { trackEvent } from '../services/googleAnalyticsTracking';
import { isClientAuthenticated } from '../services/authService';
import { getClientLiveMeetRideModel } from '../constants/clientLiveMeetRide';
import ClientCompteRideMeetDriver from './ClientCompteRideMeetDriver';
import './Dashboard.css';
import './Dashboard.app-theme.css';
import './ClientCompteDashboard.css';
import './ClientMeetDriverPage.css';

export interface ClientMeetDriverPageProps {
  onBack: () => void;
}

export default function ClientMeetDriverPage({ onBack }: ClientMeetDriverPageProps) {
  const { t } = useLanguage();
  const ride = getClientLiveMeetRideModel();
  const ok = isClientAuthenticated() && ride != null;

  return (
    <div className="page active client-meet-driver-page">
      <div className="client-meet-driver-page__inner">
        <button
          type="button"
          className="client-meet-driver-page__back"
          onClick={() => {
            trackEvent('click', 'client_meet_driver', 'back');
            onBack();
          }}
        >
          <ArrowLeft size={18} aria-hidden />
          {t('clientMeetDriver.back')}
        </button>

        {!ok ? (
          <div className="client-meet-driver-page__empty" role="status">
            <p>{t('clientMeetDriver.unavailable')}</p>
          </div>
        ) : (
          <ClientCompteRideMeetDriver
            pickupLabel={ride.pickupLabel}
            driverName={ride.driverName}
            vehicleLabel={ride.vehicleLabel}
            vehicleColor={ride.vehicleColor}
            licensePlate={ride.licensePlate}
            route={ride.route}
            departTime={ride.departTime}
            meetPickupCoords={ride.meetPickupCoords}
            meetDriverCoordsInitial={ride.meetDriverCoordsInitial}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
