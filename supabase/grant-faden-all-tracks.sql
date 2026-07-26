-- Grant the inspection student access to every Beo School track.
-- This activates and fully unlocks the curriculum, but does not create quiz
-- submissions, reviewed assignments, or certificates.

do $grant_all_tracks$
declare
  target_email constant text := 'faden6719@gmail.com';
  target_student uuid;
begin
  select id
  into target_student
  from public.profiles
  where lower(email) = lower(target_email);

  if target_student is null then
    raise exception
      'No profile exists for %. Ask the user to sign up or sign in once, then run this script again.',
      target_email;
  end if;

  update public.profiles
  set role = 'student',
      track = 'Drawing',
      enrollment_date = now() - interval '100 days',
      payment_status = 'active'
  where id = target_student;

  insert into public.enrollments (
    student_id,
    track,
    enrollment_date,
    payment_status
  )
  select
    target_student,
    granted_track,
    now() - interval '100 days',
    'active'::public.payment_state
  from unnest(
    array['Discovery', 'Drawing', 'Painting']::public.learning_track[]
  ) as granted_track
  on conflict (student_id, track) do update
  set enrollment_date = excluded.enrollment_date,
      payment_status = excluded.payment_status;
end
$grant_all_tracks$;

-- Expected result: three active tracks with every current lesson unlocked.
select
  p.name,
  p.email,
  e.track,
  e.payment_status,
  e.enrollment_date,
  count(l.id) as accessible_lessons
from public.profiles p
join public.enrollments e on e.student_id = p.id
join public.lessons l on l.track = e.track
where lower(p.email) = 'faden6719@gmail.com'
group by p.name, p.email, e.track, e.payment_status, e.enrollment_date
order by e.track;
