-- Beo School of Art - graduate validation account
-- Run only in the Supabase SQL editor for the named test student.
-- This creates completion evidence but does NOT insert certificate rows.
-- The real certificate automation must generate those certificates.

do $graduate_test$
declare
  target_email constant text := 'odekeb9@gmail.com';
  target_student uuid;
  discovery_lessons integer;
  drawing_lessons integer;
  painting_lessons integer;
  invalid_quizzes integer;
begin
  select id
  into target_student
  from public.profiles
  where lower(email) = lower(target_email);

  if target_student is null then
    raise exception 'No profile exists for %. Sign in once before running this script.', target_email;
  end if;

  select count(*) into discovery_lessons from public.lessons where track = 'Discovery';
  select count(*) into drawing_lessons from public.lessons where track = 'Drawing';
  select count(*) into painting_lessons from public.lessons where track = 'Painting';

  if discovery_lessons <> 7 or drawing_lessons <> 12 or painting_lessons <> 13 then
    raise exception
      'Curriculum count failed. Expected Discovery 7, Drawing 12, Painting 13; found %, %, %.',
      discovery_lessons, drawing_lessons, painting_lessons;
  end if;

  select count(*)
  into invalid_quizzes
  from (
    select l.lesson_code
    from public.lessons l
    left join public.quiz_questions q on q.lesson_code = l.lesson_code
    group by l.lesson_code
    having count(q.id) <> 3
  ) invalid;

  if invalid_quizzes > 0 then
    raise exception '% lessons do not have exactly three quiz questions. Run the curriculum audit first.', invalid_quizzes;
  end if;

  update public.profiles
  set role = 'student',
      track = 'Drawing',
      enrollment_date = now() - interval '100 days',
      payment_status = 'active'
  where id = target_student;

  insert into public.enrollments (student_id, track, enrollment_date, payment_status)
  select
    target_student,
    test_track,
    now() - interval '100 days',
    'active'::public.payment_state
  from unnest(
    array['Discovery', 'Drawing', 'Painting']::public.learning_track[]
  ) as test_track
  on conflict (student_id, track) do update
  set enrollment_date = excluded.enrollment_date,
      payment_status = excluded.payment_status;

  -- Add a new perfect attempt only where the student's latest attempt is not perfect.
  with correct_answers as (
    select
      l.lesson_code,
      jsonb_object_agg(q.id::text, q.correct_answer order by q.question_order) as answers
    from public.lessons l
    join public.quiz_questions q on q.lesson_code = l.lesson_code
    group by l.lesson_code
  )
  insert into public.quiz_submissions (
    student_id,
    lesson_code,
    answers,
    score,
    attempt_number,
    submitted_at
  )
  select
    target_student,
    correct_answers.lesson_code,
    correct_answers.answers,
    3,
    coalesce((
      select max(previous.attempt_number) + 1
      from public.quiz_submissions previous
      where previous.student_id = target_student
        and previous.lesson_code = correct_answers.lesson_code
    ), 1),
    now()
  from correct_answers
  where coalesce((
    select latest.score
    from public.quiz_submissions latest
    where latest.student_id = target_student
      and latest.lesson_code = correct_answers.lesson_code
    order by latest.attempt_number desc
    limit 1
  ), -1) <> 3;

  -- Preserve genuine uploaded files if they already exist. Placeholder paths are
  -- sufficient for completion testing but do not represent real student artwork.
  insert into public.assignments (
    student_id,
    lesson_code,
    file_path,
    file_url,
    submitted_at,
    seen_at,
    feedback,
    feedback_at,
    reviewed,
    reviewed_at
  )
  select
    target_student,
    l.lesson_code,
    target_student::text || '/graduate-test/' || l.lesson_code || '.png',
    'https://learn.beoarts.com/graduate-test/' || l.lesson_code || '.png',
    now(),
    now(),
    'Graduate validation record: quiz passed and practical review completed.',
    now(),
    true,
    now()
  from public.lessons l
  on conflict (student_id, lesson_code) do update
  set seen_at = coalesce(public.assignments.seen_at, now()),
      feedback = coalesce(
        nullif(public.assignments.feedback, ''),
        'Graduate validation record: quiz passed and practical review completed.'
      ),
      feedback_at = coalesce(public.assignments.feedback_at, now()),
      reviewed = true,
      reviewed_at = coalesce(public.assignments.reviewed_at, now());

  -- Re-open one completion job per track so the real automation performs the test.
  insert into public.completion_checks (
    student_id,
    track,
    reason,
    dedupe_key
  )
  select
    target_student,
    test_track,
    'graduate_validation',
    'graduate-validation:' || target_student::text || ':' || test_track::text
  from unnest(
    array['Discovery', 'Drawing', 'Painting']::public.learning_track[]
  ) as test_track
  on conflict (dedupe_key) do update
  set processed_at = null,
      certificate_id = null,
      error = null,
      created_at = now();
end
$graduate_test$;

-- Expected result: three rows, all at 100 percent.
select
  e.track,
  count(distinct l.lesson_code) as required_lessons,
  count(distinct q.lesson_code) as passed_quizzes,
  count(distinct a.lesson_code) filter (where a.reviewed) as reviewed_assignments,
  round(
    100.0 * count(distinct a.lesson_code) filter (where a.reviewed)
    / nullif(count(distinct l.lesson_code), 0)
  ) as completion_percent
from public.enrollments e
join public.lessons l on l.track = e.track
left join public.quiz_submissions q
  on q.student_id = e.student_id
 and q.lesson_code = l.lesson_code
 and q.score = 3
left join public.assignments a
  on a.student_id = e.student_id
 and a.lesson_code = l.lesson_code
where e.student_id = (
  select id from public.profiles where lower(email) = 'odekeb9@gmail.com'
)
group by e.track
order by e.track;

-- After the automation runs, this must return exactly three certificate rows.
select
  track,
  certificate_code,
  issued_at,
  email_status,
  file_url
from public.certificates
where student_id = (
  select id from public.profiles where lower(email) = 'odekeb9@gmail.com'
)
order by track;
