-- Beo School of Art: curriculum audit, completion, certificates,
-- notification queue, and structured review-call scheduling.

do $$ begin
  create type public.notification_status as enum ('pending', 'processing', 'sent', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_channel as enum ('email', 'whatsapp');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.review_booking_status as enum ('booked', 'completed', 'cancelled', 'missed');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists parent_name text,
  add column if not exists parent_email text,
  add column if not exists email_notifications boolean not null default true,
  add column if not exists whatsapp_notifications boolean not null default false;

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  track public.learning_track not null,
  file_path text not null,
  file_url text not null,
  certificate_code text not null unique,
  issued_at timestamptz not null default now(),
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  email_sent_at timestamptz,
  email_error text,
  unique (student_id, track)
);

create table if not exists public.completion_checks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  track public.learning_track not null,
  reason text not null,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  certificate_id uuid references public.certificates(id) on delete set null,
  error text
);

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  channel public.notification_channel not null default 'email',
  kind text not null,
  recipient text not null,
  subject text,
  payload jsonb not null default '{}'::jsonb,
  related_type text,
  related_id text,
  scheduled_for timestamptz not null default now(),
  status public.notification_status not null default 'pending',
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  last_error text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.review_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_available boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (starts_at, ends_at)
);

create table if not exists public.review_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.review_slots(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_code text not null references public.lessons(lesson_code) on delete cascade,
  status public.review_booking_status not null default 'booked',
  student_note text not null default '',
  admin_note text not null default '',
  booked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists completion_checks_pending_idx
  on public.completion_checks (created_at) where processed_at is null;
create index if not exists notification_jobs_due_idx
  on public.notification_jobs (scheduled_for) where status in ('pending', 'failed');
create index if not exists review_slots_available_idx
  on public.review_slots (starts_at) where is_available;
create index if not exists review_bookings_student_idx
  on public.review_bookings (student_id, booked_at desc);
create unique index if not exists review_bookings_active_assignment_idx
  on public.review_bookings (assignment_id) where status = 'booked';
create unique index if not exists review_bookings_active_slot_idx
  on public.review_bookings (slot_id) where status = 'booked';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', true, 5000000, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.certificates enable row level security;
alter table public.completion_checks enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.review_slots enable row level security;
alter table public.review_bookings enable row level security;

drop policy if exists "Students read own certificates" on public.certificates;
create policy "Students read own certificates" on public.certificates for select
using (student_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage certificates" on public.certificates;
create policy "Admins manage certificates" on public.certificates for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read completion checks" on public.completion_checks;
create policy "Admins read completion checks" on public.completion_checks for select
using (public.is_admin());

drop policy if exists "Admins manage notification jobs" on public.notification_jobs;
create policy "Admins manage notification jobs" on public.notification_jobs for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Students read available review slots" on public.review_slots;
create policy "Students read available review slots" on public.review_slots for select
using (
  (is_available and starts_at > now())
  or exists (
    select 1 from public.review_bookings b
    where b.slot_id = review_slots.id and b.student_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists "Admins manage review slots" on public.review_slots;
create policy "Admins manage review slots" on public.review_slots for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Students read own review bookings" on public.review_bookings;
create policy "Students read own review bookings" on public.review_bookings for select
using (student_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage review bookings" on public.review_bookings;
create policy "Admins manage review bookings" on public.review_bookings for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public reads certificate PDFs" on storage.objects;
create policy "Public reads certificate PDFs" on storage.objects for select
using (bucket_id = 'certificates');

create or replace function public.queue_completion_check()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  affected_student uuid;
  affected_track public.learning_track;
  event_key text;
  event_reason text;
begin
  if tg_table_name = 'quiz_submissions' then
    affected_student := new.student_id;
    select track into affected_track from public.lessons where lesson_code = new.lesson_code;
    event_key := 'quiz:' || new.id::text;
    event_reason := 'quiz_submitted';
  else
    if tg_op = 'UPDATE' and not (new.reviewed and not old.reviewed) then
      return new;
    end if;
    if tg_op = 'INSERT' and not new.reviewed then
      return new;
    end if;
    affected_student := new.student_id;
    select track into affected_track from public.lessons where lesson_code = new.lesson_code;
    event_key := 'assignment:' || new.id::text || ':reviewed';
    event_reason := 'assignment_reviewed';
  end if;

  if affected_track is not null then
    insert into public.completion_checks (student_id, track, reason, dedupe_key)
    values (affected_student, affected_track, event_reason, event_key)
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists quiz_submission_completion_check on public.quiz_submissions;
create trigger quiz_submission_completion_check
after insert on public.quiz_submissions
for each row execute function public.queue_completion_check();

drop trigger if exists assignment_review_completion_check_insert on public.assignments;
create trigger assignment_review_completion_check_insert
after insert on public.assignments
for each row execute function public.queue_completion_check();

drop trigger if exists assignment_review_completion_check_update on public.assignments;
create trigger assignment_review_completion_check_update
after update of reviewed on public.assignments
for each row execute function public.queue_completion_check();

insert into public.completion_checks (student_id, track, reason, dedupe_key)
select student_id, track, 'migration_audit', 'migration-audit:' || student_id::text || ':' || track::text
from public.enrollments
where payment_status = 'active'
on conflict (dedupe_key) do nothing;

create or replace function public.book_review_call(
  p_assignment_id uuid,
  p_slot_id uuid,
  p_student_note text default ''
)
returns public.review_bookings
language plpgsql
security definer set search_path = ''
as $$
declare
  student uuid := auth.uid();
  selected_assignment public.assignments;
  selected_slot public.review_slots;
  booking public.review_bookings;
begin
  if student is null then raise exception 'Authentication required'; end if;

  select * into selected_assignment
  from public.assignments
  where id = p_assignment_id and student_id = student;
  if selected_assignment.id is null then raise exception 'Assignment not found'; end if;
  if selected_assignment.seen_at is null then raise exception 'Your assignment must be seen before booking a review call'; end if;
  if selected_assignment.reviewed then raise exception 'This assignment review is already complete'; end if;

  select * into selected_slot
  from public.review_slots
  where id = p_slot_id and is_available and starts_at > now()
  for update;
  if selected_slot.id is null then raise exception 'This review time is no longer available'; end if;

  insert into public.review_bookings (slot_id, assignment_id, student_id, lesson_code, student_note)
  values (selected_slot.id, selected_assignment.id, student, selected_assignment.lesson_code, left(trim(p_student_note), 1000))
  returning * into booking;

  update public.review_slots set is_available = false where id = selected_slot.id;
  return booking;
end;
$$;

revoke all on function public.book_review_call(uuid, uuid, text) from public;
grant execute on function public.book_review_call(uuid, uuid, text) to authenticated;

create or replace function public.cancel_review_call(p_booking_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  student uuid := auth.uid();
  booking public.review_bookings;
begin
  select * into booking from public.review_bookings
  where id = p_booking_id and student_id = student and status = 'booked'
  for update;
  if booking.id is null then raise exception 'Booking not found'; end if;

  update public.review_bookings
  set status = 'cancelled', updated_at = now()
  where id = booking.id;
  update public.review_slots set is_available = true where id = booking.slot_id and starts_at > now();
end;
$$;

revoke all on function public.cancel_review_call(uuid) from public;
grant execute on function public.cancel_review_call(uuid) to authenticated;

create or replace function public.claim_notification_jobs(p_limit integer default 50)
returns setof public.notification_jobs
language sql
security definer set search_path = ''
as $$
  with due as (
    select id
    from public.notification_jobs
    where status in ('pending', 'failed')
      and scheduled_for <= now()
      and attempts < 4
    order by scheduled_for
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  )
  update public.notification_jobs n
  set status = 'processing',
      attempts = n.attempts + 1,
      last_attempt_at = now()
  from due
  where n.id = due.id
  returning n.*;
$$;

revoke all on function public.claim_notification_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_jobs(integer) to service_role;

create or replace function public.update_own_school_preferences(
  p_name text,
  p_phone text default null,
  p_parent_name text default null,
  p_parent_email text default null,
  p_email_notifications boolean default true,
  p_whatsapp_notifications boolean default false
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 80 then
    raise exception 'Name must be between 2 and 80 characters';
  end if;
  if p_parent_email is not null and trim(p_parent_email) <> '' and trim(p_parent_email) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid parent or guardian email';
  end if;
  if p_whatsapp_notifications and nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '') is null then
    raise exception 'Add a phone number before enabling WhatsApp notifications';
  end if;

  update public.profiles
  set name = trim(p_name),
      phone = nullif(trim(coalesce(p_phone, '')), ''),
      parent_name = nullif(trim(coalesce(p_parent_name, '')), ''),
      parent_email = nullif(lower(trim(coalesce(p_parent_email, ''))), ''),
      email_notifications = p_email_notifications,
      whatsapp_notifications = p_whatsapp_notifications
  where id = auth.uid();
end;
$$;

revoke all on function public.update_own_school_preferences(text, text, text, text, boolean, boolean) from public;
grant execute on function public.update_own_school_preferences(text, text, text, text, boolean, boolean) to authenticated;

create or replace view public.curriculum_audit_issues as
with expected(track, lesson_code) as (
  values
    ('Discovery'::public.learning_track, 'D1'), ('Discovery', 'D2'), ('Discovery', 'D3'),
    ('Discovery', 'D4'), ('Discovery', 'D5'), ('Discovery', 'D6'), ('Discovery', 'D7'),
    ('Drawing', 'DR1'), ('Drawing', 'DR2'), ('Drawing', 'DR3'), ('Drawing', 'DR4'),
    ('Drawing', 'DR5'), ('Drawing', 'DR6'), ('Drawing', 'DR7'), ('Drawing', 'DR8'),
    ('Drawing', 'DR9'), ('Drawing', 'DR10'), ('Drawing', 'DR11'), ('Drawing', 'DR12'),
    ('Painting', 'P1'), ('Painting', 'P2'), ('Painting', 'P3'), ('Painting', 'P3.5'),
    ('Painting', 'P4'), ('Painting', 'P5'), ('Painting', 'P6'), ('Painting', 'P7'),
    ('Painting', 'P8'), ('Painting', 'P9'), ('Painting', 'P10'), ('Painting', 'P11'),
    ('Painting', 'P12')
),
question_totals as (
  select lesson_code, count(*)::integer as total
  from public.quiz_questions
  group by lesson_code
),
explanation_totals as (
  select lesson_code, count(*) filter (where nullif(trim(correct_answer_text), '') is not null)::integer as total
  from public.quiz_questions
  group by lesson_code
)
select e.track, e.lesson_code, 'missing_lesson'::text as issue, 'Required lesson is missing.'::text as detail
from expected e left join public.lessons l on l.lesson_code = e.lesson_code
where l.id is null
union all
select l.track, l.lesson_code, 'lesson_content'::text,
  'Lesson title, notes, assignment instructions, or video ID is missing.'::text
from public.lessons l
where nullif(trim(l.title), '') is null
   or nullif(trim(l.notes), '') is null
   or nullif(trim(l.assignment_instructions), '') is null
   or nullif(trim(coalesce(l.youtube_video_id, '')), '') is null
union all
select l.track, l.lesson_code, 'question_count'::text,
  'Expected 3 quiz questions; found ' || coalesce(q.total, 0)::text || '.'::text
from public.lessons l left join question_totals q on q.lesson_code = l.lesson_code
where coalesce(q.total, 0) <> 3
union all
select l.track, l.lesson_code, 'answer_explanations'::text,
  'Every quiz question requires an approved teaching explanation.'::text
from public.lessons l left join explanation_totals e on e.lesson_code = l.lesson_code
where coalesce(e.total, 0) <> 3
union all
select l.track, l.lesson_code, 'assignment_channel'::text,
  'Assignment instructions still direct students to submit through WhatsApp.'::text
from public.lessons l
where l.assignment_instructions ~* '(send it on WhatsApp|submit on WhatsApp)';

revoke all on public.curriculum_audit_issues from public, anon;
grant select on public.curriculum_audit_issues to authenticated;
