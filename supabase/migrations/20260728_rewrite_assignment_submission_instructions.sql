-- Assignment work is uploaded inside the lesson page.
-- WhatsApp remains available only for arranging the review call after submission.

begin;

update public.lessons
set assignment_instructions = regexp_replace(
  regexp_replace(
    assignment_instructions,
    'send it on WhatsApp',
    'upload it using the assignment section below',
    'gi'
  ),
  'submit on WhatsApp',
  'submit it using the assignment section below',
  'gi'
)
where assignment_instructions ~* '(send it on WhatsApp|submit on WhatsApp)';

comment on column public.lessons.assignment_instructions is
  'Practical work instructions shown above the in-app assignment upload. Do not direct students to submit work through WhatsApp.';

commit;

-- This should return no rows after the migration.
select lesson_code, assignment_instructions
from public.lessons
where assignment_instructions ~* '(send it on WhatsApp|submit on WhatsApp)'
order by lesson_code;
