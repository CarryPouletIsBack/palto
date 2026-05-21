-- Paiements Stripe (autorisation manuelle + capture / annulation)

begin;

alter table public.courses
  add column if not exists palto_fee_eur numeric(10, 2) not null default 2;

alter table public.courses
  add column if not exists total_charge_eur numeric(10, 2);

alter table public.courses
  add column if not exists stripe_payment_intent_id text;

alter table public.courses
  add column if not exists stripe_payment_status text;

alter table public.courses
  add column if not exists payment_authorized_at timestamptz;

alter table public.courses
  add column if not exists payment_captured_at timestamptz;

alter table public.courses
  add column if not exists cancellation_fee_captured_cents integer;

comment on column public.courses.amount_eur is 'Tarif chauffeur (TTC) fixe par le chauffeur.';
comment on column public.courses.palto_fee_eur is 'Commission Palto (defaut 2 EUR).';
comment on column public.courses.total_charge_eur is 'Montant autorise sur la carte = amount_eur + palto_fee_eur.';
comment on column public.courses.stripe_payment_intent_id is 'PaymentIntent Stripe (capture_method manual).';

create index if not exists idx_courses_stripe_pi on public.courses (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

commit;
