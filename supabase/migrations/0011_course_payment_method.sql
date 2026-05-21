-- Mode de paiement choisi par le client (carte Stripe ou especes)

begin;

alter table public.courses
  add column if not exists payment_method text not null default 'cash';

alter table public.courses
  drop constraint if exists courses_payment_method_check;

alter table public.courses
  add constraint courses_payment_method_check
  check (payment_method in ('card', 'cash'));

comment on column public.courses.payment_method is 'card = autorisation Stripe ; cash = reglement especes au chauffeur.';

update public.courses
set payment_method = 'card'
where stripe_payment_intent_id is not null
  and trim(stripe_payment_intent_id) <> ''
  and payment_method = 'cash';

commit;
