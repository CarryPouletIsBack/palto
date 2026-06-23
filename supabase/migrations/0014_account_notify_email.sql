-- Opt-in / opt-out emails transactionnels (Resend) par compte Palto.
begin;

alter table public.app_accounts
  add column if not exists notify_email boolean not null default true;

commit;
