-- Apply this migration to existing Beo School databases.
alter table public.payments
  add column if not exists currency text not null default 'NGN',
  add column if not exists country_code text,
  add column if not exists channel text;
