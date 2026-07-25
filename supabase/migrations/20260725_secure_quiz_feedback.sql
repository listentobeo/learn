create or replace function public.submit_lesson_quiz(p_lesson_code text, p_answers jsonb)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  student uuid := auth.uid();
  total_questions integer;
  quiz_score integer;
  attempt_no integer;
  answer_review jsonb;
begin
  if student is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1
    from public.enrollments e
    join public.lessons l on l.track = e.track
    where e.student_id = student
      and e.payment_status = 'active'
      and l.lesson_code = p_lesson_code
  ) then raise exception 'This lesson is not available for your enrollment'; end if;

  select count(*)::integer into total_questions
  from public.quiz_questions where lesson_code = p_lesson_code;
  if total_questions = 0 then raise exception 'This lesson quiz has not been added yet'; end if;
  if jsonb_object_length(p_answers) <> total_questions or exists (
    select 1 from public.quiz_questions q
    where q.lesson_code = p_lesson_code
      and (not (p_answers ? q.id::text) or p_answers ->> q.id::text not in ('a','b','c','d'))
  ) then raise exception 'Answer every quiz question before submitting'; end if;

  perform pg_advisory_xact_lock(hashtext(student::text || ':' || p_lesson_code));
  select coalesce(max(attempt_number), 0) + 1 into attempt_no
  from public.quiz_submissions
  where student_id = student and lesson_code = p_lesson_code;

  select count(*)::integer into quiz_score
  from public.quiz_questions q
  where q.lesson_code = p_lesson_code
    and p_answers ->> q.id::text = q.correct_answer;

  insert into public.quiz_submissions (student_id, lesson_code, answers, score, attempt_number)
  values (student, p_lesson_code, p_answers, quiz_score, attempt_no);

  select jsonb_agg(jsonb_build_object(
    'questionId', q.id,
    'selectedAnswer', p_answers ->> q.id::text,
    'correctAnswer', q.correct_answer,
    'isCorrect', p_answers ->> q.id::text = q.correct_answer
  ) order by q.question_order) into answer_review
  from public.quiz_questions q where q.lesson_code = p_lesson_code;

  return jsonb_build_object('score', quiz_score, 'attempt', attempt_no, 'review', coalesce(answer_review, '[]'::jsonb));
end;
$$;

revoke all on function public.submit_lesson_quiz(text, jsonb) from public;
grant execute on function public.submit_lesson_quiz(text, jsonb) to authenticated;

revoke select on public.quiz_questions from public, anon, authenticated;
grant select (id, lesson_code, question_text, option_a, option_b, option_c, option_d, question_order) on public.quiz_questions to authenticated;
