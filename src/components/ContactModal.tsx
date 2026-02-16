import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import ContactForm from './ContactForm';
import './ContactModal.css';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  if (!isOpen) return null;

  const modal = (
    <div
      className="contact-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? 'Contact form' : 'Formulaire de contact'}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="contact-modal-box">
        <button
          type="button"
          className="contact-modal-close"
          onClick={onClose}
          aria-label={isEn ? 'Close' : 'Fermer'}
        >
          ×
        </button>
        <h2 className="contact-modal-title">{t('nav.contact')}</h2>
        <p className="contact-modal-subtitle">
          {isEn ? "Send me a message, I'll get back to you." : 'Envoyez-moi un message, je vous répondrai rapidement.'}
        </p>
        <ContactForm onSuccess={onClose} />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
