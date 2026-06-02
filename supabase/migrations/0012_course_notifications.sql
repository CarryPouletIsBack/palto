-- Notifications email course (anti-doublon) via Resend.
-- La table sert de verrou + journal d'envoi pour cron et triggers API.

begin;

create table if not exists public.course_notifications_log (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  notification_type text not null,
  recipient_email text not null,
  status text not null default 'processing',
  scheduled_for timestamptz,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_notifications_log_status_check check (
    status in ('processing', 'sent')
  )
);

create unique index if not exists uq_course_notifications_dedupe
  on public.course_notifications_log (course_id, notification_type, recipient_email);

create index if not exists idx_course_notifications_status_created
  on public.course_notifications_log (status, created_at desc);

alter table public.course_notifications_log enable row level security;

commit;
