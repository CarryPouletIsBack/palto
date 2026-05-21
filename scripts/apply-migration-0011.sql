-- Appliquer sur Supabase SQL Editor (migration 0011)
alter table public.courses
  add column if not exists payment_method text not null default 'cash';

alter table public.courses
  drop constraint if exists courses_payment_method_check;

alter table public.courses
  add constraint courses_payment_method_check
  check (payment_method in ('card', 'cash'));

update public.courses
set payment_method = 'card'
where stripe_payment_intent_id is not null
  and trim(stripe_payment_intent_id) <> ''
  and payment_method = 'cash';
