import {
  Bell,
  Car,
  CircleHelp,
  FileText,
  Info,
  LogOut,
  MapPin,
  Palette,
  Shield,
  Settings,
  Type,
  Building2,
  IdCard,
  Languages,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  MobileAccountHubMenuCard,
  MobileAccountHubProfile,
  MobileAccountHubQuickCard,
  MobileAccountHubToolbar,
  type MobileAccountHubMenuRow,
} from './MobileAccountHub';

export type ChauffeurMobileAccountDestination =
  | 'profile'
  | 'ride-settings'
  | 'help'
  | 'overview-profile'
  | 'palto-payment'
  | 'documents'
  | 'pref-location'
  | 'pref-language'
  | 'pref-appearance'
  | 'pref-display'
  | 'pref-notifications'
  | 'pref-security'
  | 'organization'
  | 'about';

type Props = {
  photoUrl: string | null;
  prenom: string;
  nom: string;
  email: string;
  hasOrganization: boolean;
  isEn: boolean;
  onClose: () => void;
  onOpen: (dest: ChauffeurMobileAccountDestination) => void;
  onLogout: () => void;
  notificationsButton?: ReactNode;
};

export default function ChauffeurMobileAccountHub({
  photoUrl,
  prenom,
  nom,
  email,
  hasOrganization,
  isEn,
  onClose,
  onOpen,
  onLogout,
  notificationsButton,
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
      onClick: () => onOpen('overview-profile'),
    },
    {
      id: 'payment',
      label: isEn ? 'Payment' : 'Paiement',
      icon: <Wallet size={18} />,
      onClick: () => onOpen('palto-payment'),
    },
    {
      id: 'documents',
      label: isEn ? 'Documents & compliance' : 'Documents & conformite',
      icon: <FileText size={18} />,
      onClick: () => onOpen('documents'),
    },
    {
      id: 'security',
      label: isEn ? 'Security & password' : 'Securite & mot de passe',
      icon: <Shield size={18} />,
      onClick: () => onOpen('pref-security'),
    },
    {
      id: 'location',
      label: isEn ? 'Location' : 'Localisation',
      icon: <MapPin size={18} />,
      onClick: () => onOpen('pref-location'),
    },
    {
      id: 'notifications',
      label: isEn ? 'Notifications' : 'Notifications',
      icon: <Bell size={18} />,
      onClick: () => onOpen('pref-notifications'),
    },
  ];

  const menuSettings: MobileAccountHubMenuRow[] = [
    {
      id: 'language',
      label: isEn ? 'Language' : 'Langue',
      icon: <Languages size={18} />,
      onClick: () => onOpen('pref-language'),
    },
    {
      id: 'appearance',
      label: isEn ? 'Appearance' : 'Apparence',
      icon: <Palette size={18} />,
      onClick: () => onOpen('pref-appearance'),
    },
    {
      id: 'text-size',
      label: isEn ? 'Text size' : 'Taille du texte',
      icon: <Type size={18} />,
      onClick: () => onOpen('pref-display'),
    },
  ];

  if (hasOrganization) {
    menuSettings.unshift({
      id: 'organization',
      label: isEn ? 'Organization' : 'Organisation',
      icon: <Building2 size={18} />,
      onClick: () => onOpen('organization'),
    });
  }

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
        trailing={notificationsButton}
      />
      <MobileAccountHubProfile photoUrl={photoUrl} prenom={prenom} nom={nom} email={email} />
      <div className="mobile-account-hub__quick-grid">
        <MobileAccountHubQuickCard
          title={isEn ? 'Your vehicle' : 'Votre vehicule'}
          icon={<Car size={18} />}
          onClick={() => onOpen('profile')}
        />
        <MobileAccountHubQuickCard
          title={isEn ? 'My pricing' : 'Mes tarifs'}
          icon={<Settings size={18} />}
          onClick={() => onOpen('ride-settings')}
        />
      </div>
      <MobileAccountHubMenuCard rows={menuPrimary} />
      <MobileAccountHubMenuCard rows={menuSettings} />
      <MobileAccountHubMenuCard rows={menuFooter} />
    </div>
  );
}
