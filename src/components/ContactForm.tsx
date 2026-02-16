'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import './ContactForm.css';

const formSchemaFr = z.object({
  name: z.string().min(2, { message: 'Le nom doit faire au moins 2 caractères.' }),
  email: z.string().email({ message: 'Email invalide.' }),
  company: z.string().optional(),
  message: z.string().min(10, { message: 'Le message doit faire au moins 10 caractères.' }),
});

const formSchemaEn = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email.' }),
  company: z.string().optional(),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

type FormData = z.infer<typeof formSchemaFr>;

/** Champ honeypot anti-spam : si rempli par un bot, l'API rejette (invisible pour l'utilisateur) */
const HONEYPOT_FIELD = 'website';

export default function ContactForm({ onSuccess }: { onSuccess?: () => void }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = isEn ? formSchemaEn : formSchemaFr;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const form = document.querySelector('.contact-form') as HTMLFormElement;
      const honeypot = form?.querySelector(`[name="${HONEYPOT_FIELD}"]`) as HTMLInputElement;
      const body: Record<string, string> = { name: data.name, email: data.email, message: data.message };
      if (data.company?.trim()) body.company = data.company.trim();
      if (honeypot?.value) body[HONEYPOT_FIELD] = honeypot.value;
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de l\'envoi');
      }

      toast.success(isEn ? 'Message sent! I\'ll reply soon. ✦' : 'Message envoyé ! Je vous réponds vite. ✦');
      reset();
      onSuccess?.();
    } catch (error) {
      toast.error(isEn ? 'Something went wrong.' : 'Oups, une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const labels = isEn
    ? { name: 'Name', email: 'Email', company: 'Company', message: 'Message', submit: 'Send message', sending: 'Sending...' }
    : { name: 'Nom', email: 'Email', company: 'Nom de l\'entreprise', message: 'Message', submit: 'Envoyer le message', sending: 'Envoi en cours...' };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="contact-form space-y-4 max-w-md mx-auto">
      {/* Honeypot anti-spam : invisible, les bots le remplissent souvent */}
      <div className="contact-form-honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Ne pas remplir</label>
        <input
          id="contact-website"
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          className="contact-form-honeypot-input"
        />
      </div>
      <div className="contact-form-field">
        <label htmlFor="contact-name" className="contact-form-label">
          {labels.name}
        </label>
        <input
          {...register('name')}
          id="contact-name"
          type="text"
          placeholder="Jane Doe"
          className="contact-form-input"
        />
        {errors.name && <span className="contact-form-error">{errors.name.message}</span>}
      </div>

      <div className="contact-form-field">
        <label htmlFor="contact-email" className="contact-form-label">
          {labels.email}
        </label>
        <input
          {...register('email')}
          id="contact-email"
          type="email"
          placeholder="jane.doe@example.com"
          className="contact-form-input"
        />
        {errors.email && <span className="contact-form-error">{errors.email.message}</span>}
      </div>

      <div className="contact-form-field">
        <label htmlFor="contact-company" className="contact-form-label">
          {labels.company}
        </label>
        <input
          {...register('company')}
          id="contact-company"
          type="text"
          placeholder={isEn ? 'Acme Inc.' : 'Acme Inc.'}
          className="contact-form-input"
        />
      </div>

      <div className="contact-form-field">
        <label htmlFor="contact-message" className="contact-form-label">
          {labels.message}
        </label>
        <textarea
          {...register('message')}
          id="contact-message"
          rows={4}
          placeholder={isEn ? 'Your message...' : 'Votre message...'}
          className="contact-form-input contact-form-textarea"
        />
        {errors.message && <span className="contact-form-error">{errors.message.message}</span>}
      </div>

      <div className="contact-form-submit-wrap">
      <button
        type="submit"
        disabled={isSubmitting}
        className="contact-form-submit"
      >
        {isSubmitting ? labels.sending : labels.submit}
      </button>
      </div>
    </form>
  );
}
