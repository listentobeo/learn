create table if not exists public.enrollments (
  student_id uuid not null references public.profiles(id) on delete cascade,
  track public.learning_track not null,
  enrollment_date timestamptz not null default now(),
  payment_status public.payment_state not null default 'active',
  created_at timestamptz not null default now(),
  primary key (student_id, track)
);

alter table public.enrollments enable row level security;

drop policy if exists "Students read own enrollments" on public.enrollments;
create policy "Students read own enrollments" on public.enrollments for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "Admins manage enrollments" on public.enrollments;
create policy "Admins manage enrollments" on public.enrollments for all using (public.is_admin()) with check (public.is_admin());

insert into public.enrollments (student_id, track, enrollment_date, payment_status)
select id, track, coalesce(enrollment_date, now()), payment_status
from public.profiles
where payment_status = 'active'
on conflict (student_id, track) do nothing;

drop policy if exists "Paid students read their track lessons" on public.lessons;
create policy "Paid students read their track lessons" on public.lessons for select using (
  exists(select 1 from public.enrollments e where e.student_id = auth.uid() and e.payment_status = 'active' and e.track = lessons.track)
  or public.is_admin()
);

drop policy if exists "Paid students read quiz prompts" on public.quiz_questions;
create policy "Paid students read quiz prompts" on public.quiz_questions for select using (
  exists(select 1 from public.enrollments e join public.lessons l on l.track = e.track where e.student_id = auth.uid() and e.payment_status = 'active' and l.lesson_code = quiz_questions.lesson_code)
  or public.is_admin()
);

drop policy if exists "Students read their welcome video" on public.track_welcome_videos;
create policy "Students read their welcome video" on public.track_welcome_videos for select using (
  exists(select 1 from public.enrollments e where e.student_id = auth.uid() and e.payment_status = 'active' and e.track = track_welcome_videos.track)
  or public.is_admin()
);
