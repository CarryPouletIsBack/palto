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
  message: z.string().min(10, { message: 'Le message doit faire au moins 10 caractères.' }),
});

const formSchemaEn = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
});

type FormData = z.infer<typeof formSchemaFr>;

export default function ContactForm() {
  const { t, language } = useLanguage();
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
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de l\'envoi');
      }

      toast.success(isEn ? 'Message sent! I\'ll reply soon. ✦' : 'Message envoyé ! Je vous réponds vite. ✦');
      reset();
    } catch (error) {
      toast.error(isEn ? 'Something went wrong.' : 'Oups, une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const labels = isEn
    ? { name: 'Name', email: 'Email', message: 'Message', submit: 'Send message', sending: 'Sending...' }
    : { name: 'Nom', email: 'Email', message: 'Message', submit: 'Envoyer le message', sending: 'Envoi en cours...' };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="contact-form space-y-4 max-w-md mx-auto">
      <div className="contact-form-field">
        <label htmlFor="contact-name" className="contact-form-label">
          {labels.name}
        </label>
        <input
          {...register('name')}
          id="contact-name"
          type="text"
          placeholder="Yann-Edern"
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
          placeholder="hello@linear.app"
          className="contact-form-input"
        />
        {errors.email && <span className="contact-form-error">{errors.email.message}</span>}
      </div>

      <div className="contact-form-field">
        <label htmlFor="contact-message" className="contact-form-label">
          {labels.message}
        </label>
        <textarea
          {...register('message')}
          id="contact-message"
          rows={4}
          placeholder={isEn ? "I love your portfolio..." : "J'adore ton portfolio..."}
          className="contact-form-input contact-form-textarea"
        />
        {errors.message && <span className="contact-form-error">{errors.message.message}</span>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="contact-form-submit"
      >
        {isSubmitting ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
