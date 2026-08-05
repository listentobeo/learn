-- Beo School of Art: quiz-led rewards and persistent immersive studio layout.

-- The separate pre-quiz challenge was retired in favour of rewarding the quiz
-- and its correction cycle directly. Existing challenge rewards remain earned.
update public.lesson_game_challenges set active = false where active;

create or replace function public.reward_quiz_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_gamification_event(
    new.student_id,
    'quiz_submitted',
    'lesson',
    new.lesson_code,
    20,
    5,
    'quiz-first:' || new.student_id::text || ':' || new.lesson_code,
    jsonb_build_object('attempt', new.attempt_number, 'score', new.score)
  );

  if new.score = 3 then
    perform public.award_gamification_event(
      new.student_id,
      'quiz_mastered',
      'lesson',
      new.lesson_code,
      20,
      7,
      'quiz-mastered:' || new.student_id::text || ':' || new.lesson_code,
      jsonb_build_object('attempt', new.attempt_number)
    );

    if exists (
      select 1 from public.quiz_submissions q
      where q.student_id = new.student_id
        and q.lesson_code = new.lesson_code
        and q.id <> new.id
        and q.score < 3
    ) then
      perform public.award_gamification_event(
        new.student_id,
        'quiz_correction_mastered',
        'lesson',
        new.lesson_code,
        10,
        3,
        'quiz-correction:' || new.student_id::text || ':' || new.lesson_code,
        jsonb_build_object('attempt', new.attempt_number)
      );
    end if;
  end if;

  perform public.award_completed_lesson(new.student_id, new.lesson_code);
  return new;
end;
$$;

-- Keep existing students economically aligned with the new quiz-led system.
do $$
declare
  mastered record;
begin
  for mastered in
    with mastery as (
      select student_id, lesson_code,
        min(attempt_number) filter (where score = 3) as mastery_attempt
      from public.quiz_submissions
      group by student_id, lesson_code
      having max(score) = 3
    )
    select m.student_id, m.lesson_code, m.mastery_attempt,
      exists (
        select 1 from public.quiz_submissions q
        where q.student_id = m.student_id
          and q.lesson_code = m.lesson_code
          and q.score < 3
          and q.attempt_number < m.mastery_attempt
      ) as corrected
    from mastery m
  loop
    perform public.award_gamification_event(
      mastered.student_id, 'quiz_mastered', 'lesson', mastered.lesson_code,
      20, 7,
      'quiz-mastered:' || mastered.student_id::text || ':' || mastered.lesson_code,
      jsonb_build_object('attempt', mastered.mastery_attempt, 'backfill', true)
    );
    if mastered.corrected then
      perform public.award_gamification_event(
        mastered.student_id, 'quiz_correction_mastered', 'lesson', mastered.lesson_code,
        10, 3,
        'quiz-correction:' || mastered.student_id::text || ':' || mastered.lesson_code,
        jsonb_build_object('attempt', mastered.mastery_attempt, 'backfill', true)
      );
    end if;
  end loop;
end $$;

create or replace function public.set_studio_layout(p_layout jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid := auth.uid();
  featured_text text := nullif(p_layout->>'featuredArtworkId', '');
  decor jsonb := coalesce(p_layout->'decorSlots', '{}'::jsonb);
  studio_row public.student_studios;
begin
  if student is null then raise exception 'Authentication required'; end if;
  perform public.ensure_gamification_profile(student);

  if jsonb_typeof(coalesce(p_layout, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(decor) <> 'object' then
    raise exception 'Invalid studio layout';
  end if;

  if featured_text is not null and not exists (
    select 1 from public.assignments
    where id = featured_text::uuid and student_id = student
  ) then
    raise exception 'Featured assignment not found';
  end if;

  if featured_text is not null and not exists (
    select 1 from public.student_inventory i
    join public.studio_catalog_items c on c.id = i.item_id
    where i.student_id = student and c.item_key = 'easel' and c.category = 'decor'
  ) then
    raise exception 'Own the Studio Easel before featuring an assignment';
  end if;

  if exists (
    select 1
    from jsonb_each_text(decor) slot
    where slot.key not in ('work-left', 'work-right', 'work-shelf', 'gallery-light', 'achievement-left', 'achievement-right')
      or not exists (
        select 1 from public.student_inventory i
        join public.studio_catalog_items c on c.id = i.item_id
        where i.student_id = student
          and i.item_id = slot.value::uuid
          and c.category = 'decor'
          and c.active
      )
  ) then
    raise exception 'Studio layout contains an unavailable decoration';
  end if;

  if (select count(*) from jsonb_each_text(decor)) > 6 then
    raise exception 'Too many studio decorations';
  end if;

  if exists (
    select 1 from jsonb_each_text(decor)
    group by value having count(*) > 1
  ) then
    raise exception 'A decoration can occupy only one room position';
  end if;

  update public.student_studios
  set layout_config = jsonb_build_object(
        'featuredArtworkId', featured_text,
        'decorSlots', decor
      ),
      updated_at = now()
  where student_id = student
  returning * into studio_row;
  return to_jsonb(studio_row);
end;
$$;

revoke all on function public.set_studio_layout(jsonb) from public;
grant execute on function public.set_studio_layout(jsonb) to authenticated;
