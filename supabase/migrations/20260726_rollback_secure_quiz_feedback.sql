-- Run this only if 20260725_secure_quiz_feedback.sql was already applied.
-- It restores the quiz schema and permissions used before answer corrections.

drop function if exists public.submit_lesson_quiz(text, jsonb);

grant select on public.quiz_questions to authenticated;
grant select on public.quiz_questions to anon;
