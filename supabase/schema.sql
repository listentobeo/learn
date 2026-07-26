-- Beo School of Art Vol. 1
-- Run this file in the Supabase SQL editor, then add the Paystack webhook URL:
-- https://learn.beoarts.com/api/paystack/webhook

create extension if not exists "pgcrypto";

create type public.learning_track as enum ('Drawing', 'Painting', 'Discovery');
create type public.payment_state as enum ('pending', 'active', 'past_due');
create type public.user_role as enum ('student', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  track public.learning_track not null,
  enrollment_date timestamptz,
  payment_status public.payment_state not null default 'pending',
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  track public.learning_track not null,
  lesson_code text not null unique,
  title text not null,
  youtube_video_id text,
  notes text not null default '',
  assignment_instructions text not null default '',
  week_number integer not null check (week_number > 0),
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_code text not null references public.lessons(lesson_code) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('a','b','c','d')),
  question_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_code text not null references public.lessons(lesson_code) on delete cascade,
  answers jsonb not null,
  score integer not null check (score between 0 and 3),
  attempt_number integer not null default 1 check (attempt_number > 0),
  submitted_at timestamptz not null default now(),
  unique (student_id, lesson_code, attempt_number)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_code text not null references public.lessons(lesson_code) on delete cascade,
  file_path text not null,
  file_url text not null,
  submitted_at timestamptz not null default now(),
  seen_at timestamptz,
  feedback text,
  feedback_at timestamptz,
  reviewed boolean not null default false,
  reviewed_at timestamptz,
  unique (student_id, lesson_code)
);

create table public.track_welcome_videos (
  track public.learning_track primary key,
  title text not null,
  youtube_video_id text,
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null default 'NGN',
  country_code text,
  channel text,
  track public.learning_track not null,
  plan text not null check (plan in ('full','monthly')),
  status text not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  student_id uuid not null references public.profiles(id) on delete cascade,
  track public.learning_track not null,
  enrollment_date timestamptz not null default now(),
  payment_status public.payment_state not null default 'active',
  created_at timestamptz not null default now(),
  primary key (student_id, track)
);

create table public.paystack_plans (
  track public.learning_track not null,
  currency text not null check (currency in ('NGN','USD')),
  plan_code text not null unique,
  amount numeric(12,2) not null,
  invoice_limit integer not null default 3 check (invoice_limit > 0),
  created_at timestamptz not null default now(),
  primary key (track, currency)
);

create table public.subscriptions (
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, track)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'track')::public.learning_track, 'Drawing')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_submissions enable row level security;
alter table public.assignments enable row level security;
alter table public.track_welcome_videos enable row level security;
alter table public.payments enable row level security;
alter table public.enrollments enable row level security;
alter table public.paystack_plans enable row level security;
alter table public.subscriptions enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create or replace function public.update_own_profile_name(new_name text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(new_name)) < 2 or char_length(trim(new_name)) > 80 then
    raise exception 'Name must be between 2 and 80 characters';
  end if;
  update public.profiles set name = trim(new_name) where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile_name(text) from public;
grant execute on function public.update_own_profile_name(text) to authenticated;

create policy "Students read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Admins update profiles" on public.profiles for update using (public.is_admin());
create policy "Paid students read their track lessons" on public.lessons for select using (
  exists(select 1 from public.enrollments e where e.student_id = auth.uid() and e.payment_status = 'active' and e.track = lessons.track)
  or public.is_admin()
);
create policy "Paid students read quiz prompts" on public.quiz_questions for select using (
  exists(select 1 from public.enrollments e join public.lessons l on l.track = e.track where e.student_id = auth.uid() and e.payment_status = 'active' and l.lesson_code = quiz_questions.lesson_code)
  or public.is_admin()
);
create policy "Students read own quiz results" on public.quiz_submissions for select using (student_id = auth.uid() or public.is_admin());
create policy "Students submit own quiz" on public.quiz_submissions for insert with check (student_id = auth.uid());
create policy "Students read own assignments" on public.assignments for select using (student_id = auth.uid() or public.is_admin());
create policy "Students submit own assignments" on public.assignments for insert with check (student_id = auth.uid());
create policy "Admins review assignments" on public.assignments for update using (public.is_admin());
create policy "Students read their welcome video" on public.track_welcome_videos for select using (
  exists(select 1 from public.enrollments e where e.student_id = auth.uid() and e.payment_status = 'active' and e.track = track_welcome_videos.track)
  or public.is_admin()
);
create policy "Admins insert welcome videos" on public.track_welcome_videos for insert with check (public.is_admin());
create policy "Admins update welcome videos" on public.track_welcome_videos for update using (public.is_admin()) with check (public.is_admin());
create policy "Students read own payments" on public.payments for select using (student_id = auth.uid() or public.is_admin());
create policy "Students read own enrollments" on public.enrollments for select using (student_id = auth.uid() or public.is_admin());
create policy "Admins manage enrollments" on public.enrollments for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage payment plans" on public.paystack_plans for all using (public.is_admin()) with check (public.is_admin());
create policy "Students read own subscriptions" on public.subscriptions for select using (student_id = auth.uid() or public.is_admin());
create policy "Admins manage subscriptions" on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assignments', 'assignments', false, 10000000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "Students upload own assignment images" on storage.objects for insert to authenticated
with check (bucket_id = 'assignments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Students read own assignment images" on storage.objects for select to authenticated
using (bucket_id = 'assignments' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Seed lesson shells. Add YouTube IDs, notes, assignments, and questions from the admin SQL editor.
insert into public.lessons (track, lesson_code, title, week_number) values
('Discovery','D1','The Artist’s Eye',1), ('Discovery','D2','Lines, Shapes & Edges',2),
('Discovery','D3','Light and Shadow',3), ('Discovery','D4','Drawing What You See',4),
('Discovery','D5','Finding Your Visual Voice',5), ('Discovery','D6','Colour Without Fear',6),
('Discovery','D7','Your First Finished Piece',7),
('Drawing','DR1','Learning to See',1), ('Drawing','DR2','Line, Gesture & Rhythm',2),
('Drawing','DR3','Shape and Structure',3), ('Drawing','DR4','Form Through Light',4),
('Drawing','DR5','Perspective Essentials',5), ('Drawing','DR6','Still Life Foundations',6),
('Drawing','DR7','Portrait Proportions',7), ('Drawing','DR8','Features of the Face',8),
('Drawing','DR9','Figure and Gesture',9), ('Drawing','DR10','Texture and Detail',10),
('Drawing','DR11','Composition in Drawing',11), ('Drawing','DR12','The Finished Drawing',12),
('Painting','P1','Your Painting Practice',1), ('Painting','P2','Colour, Value & Temperature',2),
('Painting','P3','Brushwork and Paint Control',3), ('Painting','P3.5','Studio Study: Limited Palette',4),
('Painting','P4','From Drawing to Painting',5), ('Painting','P5','Mixing Natural Colour',6),
('Painting','P6','Painting Light',7), ('Painting','P7','Edges and Atmosphere',8),
('Painting','P8','Still Life in Colour',9), ('Painting','P9','The Painted Portrait',10),
('Painting','P10','Composition and Story',11), ('Painting','P11','Developing a Personal Language',12),
('Painting','P12','The Final Painting',13)
on conflict (lesson_code) do nothing;

insert into public.track_welcome_videos (track, title, description) values
('Discovery', 'Welcome to Discovery', 'Begin here before opening your first lesson.'),
('Drawing', 'Welcome to Drawing Guided', 'Your orientation to the drawing studio and weekly learning rhythm.'),
('Painting', 'Welcome to Painting Guided', 'Your orientation to materials, practice, and the painting studio.')
on conflict (track) do nothing;

insert into public.enrollments (student_id, track, enrollment_date, payment_status)
select id, track, coalesce(enrollment_date, now()), payment_status
from public.profiles
where payment_status = 'active'
on conflict (student_id, track) do nothing;

-- After signing up, promote Benjamin once:
-- update public.profiles set role = 'admin' where email = 'admin@beoarts.com';
