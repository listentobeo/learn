-- Apply this migration to existing Beo School databases.
alter table public.quiz_submissions
  drop constraint if exists quiz_submissions_student_id_lesson_code_key;

alter table public.quiz_submissions
  add column if not exists attempt_number integer not null default 1;

alter table public.quiz_submissions
  drop constraint if exists quiz_submissions_attempt_number_check;

alter table public.quiz_submissions
  add constraint quiz_submissions_attempt_number_check check (attempt_number > 0);

create unique index if not exists quiz_submissions_student_lesson_attempt_idx
  on public.quiz_submissions (student_id, lesson_code, attempt_number);
