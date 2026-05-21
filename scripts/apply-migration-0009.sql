-- SQL Editor : migration 0009 — Stripe client + portefeuille
-- https://supabase.com/dashboard/project/uzjplpdpbxvzhisxgwfz/sql/new

begin;

alter table public.client_profile_data
  add column if not exists stripe_customer_id text;

alter table public.client_profile_data
  add column if not exists wallet_balance_cents integer not null default 0;

alter table public.client_profile_data
  drop constraint if exists client_profile_data_wallet_nonneg;

alter table public.client_profile_data
  add constraint client_profile_data_wallet_nonneg check (wallet_balance_cents >= 0);

create table if not exists public.client_wallet_topups (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.app_accounts(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  stripe_payment_intent_id text not null,
  created_at timestamptz not null default now(),
  constraint client_wallet_topups_pi_unique unique (stripe_payment_intent_id)
);

create index if not exists idx_client_wallet_topups_account on public.client_wallet_topups (account_id, created_at desc);

commit;
