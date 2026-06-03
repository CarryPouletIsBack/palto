import {
  Bell,
  CircleHelp,
  FileLock,
  IdCard,
  Info,
  LogOut,
  MapPin,
  Route,
  Settings,
  Shield,
  Wallet,
  Eye,
  Palette,
  Accessibility,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  MobileAccountHubMenuCard,
  MobileAccountHubProfile,
  MobileAccountHubQuickCard,
  MobileAccountHubToolbar,
  type MobileAccountHubMenuRow,
} from './MobileAccountHub';

export type ClientMobileAccountDestination =
  | 'personal'
  | 'security'
  | 'payment'
  | 'help'
  | 'courses'
  | 'places'
  | 'settings'
  | 'about';

type Props = {
  photoUrl: string | null;
  prenom: string;
  nom: string;
  email: string;
  paymentEnabled: boolean;
  isEn: boolean;
  onClose: () => void;
  onOpen: (dest: ClientMobileAccountDestination) => void;
  onLogout: () => void;
  bookRideButton?: ReactNode;
};

export default function ClientMobileAccountHub({
  photoUrl,
  prenom,
  nom,
  email,
  paymentEnabled,
  isEn,
  onClose,
  onOpen,
  onLogout,
  bookRideButton,
}: Props) {
  const menuPrimary: MobileAccountHubMenuRow[] = [
    {
      id: 'help',
      label: isEn ? 'Help' : 'Aides',
      icon: <CircleHelp size={18} />,
      onClick: () => onOpen('help'),
    },
    {
      id: 'personal',
      label: isEn ? 'Personal information' : 'Informations personnelles',
      icon: <IdCard size={18} />,
      onClick: () => onOpen('personal'),
    },
  ];

  if (paymentEnabled) {
    menuPrimary.push({
      id: 'payment',
      label: isEn ? 'Payment methods' : 'Moyens de paiement',
      icon: <Wallet size={18} />,
      onClick: () => onOpen('payment'),
    });
  }

  const menuSettings: MobileAccountHubMenuRow[] = [
    {
      id: 'security',
      label: isEn ? 'Security' : 'Securite',
      icon: <Shield size={18} />,
      onClick: () => onOpen('security'),
    },
    {
      id: 'privacy',
      label: isEn ? 'Privacy' : 'Confidentialite',
      icon: <FileLock size={18} />,
      disabled: true,
    },
    {
      id: 'settings',
      label: isEn ? 'Palto settings' : 'Reglages Palto',
      icon: <Settings size={18} />,
      onClick: () => onOpen('settings'),
    },
    {
      id: 'appearance',
      label: isEn ? 'Appearance' : 'Apparence',
      icon: <Palette size={18} />,
      onClick: () => onOpen('settings'),
    },
    {
      id: 'accessibility',
      label: isEn ? 'Accessibility' : 'Accessibilite',
      icon: <Accessibility size={18} />,
      onClick: () => onOpen('settings'),
    },
    {
      id: 'notifications',
      label: isEn ? 'Notifications' : 'Notifications',
      icon: <Bell size={18} />,
      onClick: () => onOpen('settings'),
    },
  ];

  const menuFooter: MobileAccountHubMenuRow[] = [
    {
      id: 'about',
      label: isEn ? 'About Palto' : 'A propos de Palto',
      icon: <Info size={18} />,
      onClick: () => onOpen('about'),
    },
    {
      id: 'logout',
      label: isEn ? 'Sign out' : 'Se deconnecter',
      icon: <LogOut size={18} />,
      onClick: onLogout,
      danger: true,
    },
  ];

  return (
    <div className="mobile-account-hub">
      <MobileAccountHubToolbar
        mode="close"
        onPrimaryAction={onClose}
        primaryAriaLabel={isEn ? 'Close account' : 'Fermer le compte'}
        trailing={bookRideButton}
      />
      <MobileAccountHubProfile photoUrl={photoUrl} prenom={prenom} nom={nom} email={email} />
      <div className="mobile-account-hub__quick-grid">
        <MobileAccountHubQuickCard
          title={isEn ? 'My rides' : 'Mes courses'}
          icon={<Route size={18} />}
          onClick={() => onOpen('courses')}
        />
        <MobileAccountHubQuickCard
          title={isEn ? 'Saved places' : 'Lieux enregistres'}
          icon={<MapPin size={18} />}
          onClick={() => onOpen('places')}
        />
      </div>
      <MobileAccountHubMenuCard rows={menuPrimary} />
      <MobileAccountHubMenuCard rows={menuSettings} />
      <MobileAccountHubMenuCard rows={menuFooter} />
    </div>
  );
}
