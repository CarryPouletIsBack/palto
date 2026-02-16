import { useLanguage } from '../contexts/LanguageContext';
import ContactForm from './ContactForm';
import './Contact.css';

interface ContactProps {
  onBackClick?: () => void;
}

export default function Contact({ onBackClick }: ContactProps) {
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const title = t('nav.contact');
  const subtitle = isEn
    ? 'Send me a message and I\'ll get back to you.'
    : 'Envoyez-moi un message, je vous répondrai rapidement.';

  return (
    <main className="contact-page" id="contact">
      <div className="contact-page-inner">
        {onBackClick && (
          <button
            type="button"
            onClick={onBackClick}
            className="contact-back"
            aria-label={isEn ? 'Back' : 'Retour'}
          >
            ← {isEn ? 'Back' : 'Retour'}
          </button>
        )}
        <h1 className="contact-title">{title}</h1>
        <p className="contact-subtitle">{subtitle}</p>
        <ContactForm />
      </div>
    </main>
  );
}
