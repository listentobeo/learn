create table if not exists public.paystack_plans (
  track public.learning_track not null,
  currency text not null check (currency in ('NGN','USD')),
  plan_code text not null unique,
  amount numeric(12,2) not null,
  invoice_limit integer not null default 3 check (invoice_limit > 0),
  created_at timestamptz not null default now(),
  primary key (track, currency)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  track public.learning_track not null,
  plan_code text not null,
  subscription_code text unique,
  customer_code text,
  status text not null default 'active',
  next_payment_date timestamptz,
  invoice_limit integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, track)
);

alter table public.paystack_plans enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Admins manage payment plans" on public.paystack_plans;
create policy "Admins manage payment plans" on public.paystack_plans for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Students read own subscriptions" on public.subscriptions;
create policy "Students read own subscriptions" on public.subscriptions for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "Admins manage subscriptions" on public.subscriptions;
create policy "Admins manage subscriptions" on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());
