-- Beo School of Art: persistent 3D studio transforms and score-led quiz rewards.

alter table public.studio_displays
  add column if not exists wall_id text not null default 'wall-a',
  add column if not exists position_x numeric(6,3) not null default 0,
  add column if not exists position_y numeric(6,3) not null default 2.35,
  add column if not exists scale numeric(5,3) not null default 1,
  add column if not exists rotation_z numeric(6,3) not null default 0;

do $$ begin
  alter table public.studio_displays add constraint studio_displays_wall_id_check
    check (wall_id in ('wall-a', 'wall-b', 'wall-c'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.studio_displays add constraint studio_displays_position_x_check
    check (position_x between -1.45 and 1.45);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.studio_displays add constraint studio_displays_position_y_check
    check (position_y between 1.25 and 3.75);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.studio_displays add constraint studio_displays_scale_check
    check (scale between .55 and 1.65);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.studio_displays add constraint studio_displays_rotation_check
    check (rotation_z between -.30 and .30);
exception when duplicate_object then null; end $$;

-- Give historical work a useful three-wall arrangement without moving later edits.
with ranked as (
  select assignment_id,
    row_number() over (partition by student_id order by coalesce(wall_slot, 9999), created_at) - 1 as n
  from public.studio_displays
  where layout_config = '{}'::jsonb
)
update public.studio_displays d set
  wall_id = ('wall-' || chr(97 + (r.n % 3)::int)),
  position_x = case (r.n / 3) % 4 when 0 then -1.2 when 1 then -0.4 when 2 then 0.4 else 1.2 end,
  position_y = case ((r.n / 3) / 4) % 3 when 0 then 3.35 when 1 then 2.35 else 1.35 end,
  scale = .66
from ranked r where r.assignment_id = d.assignment_id;

create or replace function public.save_studio_artwork_transform(
  p_assignment_id uuid,
  p_wall_id text,
  p_position_x numeric,
  p_position_y numeric,
  p_scale numeric,
  p_rotation_z numeric,
  p_frame_item_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid := auth.uid();
  display_row public.studio_displays;
begin
  if student is null then raise exception 'Authentication required'; end if;
  if p_wall_id not in ('wall-a', 'wall-b', 'wall-c') then raise exception 'Unknown studio wall'; end if;
  if not exists (select 1 from public.assignments where id = p_assignment_id and student_id = student) then
    raise exception 'Assignment not found';
  end if;
  if p_frame_item_id is not null and not exists (
    select 1 from public.student_inventory i
    join public.studio_catalog_items c on c.id = i.item_id
    where i.student_id = student and i.item_id = p_frame_item_id
      and c.category = 'frame' and c.active
  ) then raise exception 'You do not own this frame'; end if;

  insert into public.studio_displays (
    assignment_id, student_id, frame_item_id, wall_id,
    position_x, position_y, scale, rotation_z, layout_config
  ) values (
    p_assignment_id, student, p_frame_item_id, p_wall_id,
    greatest(-1.45, least(1.45, p_position_x)),
    greatest(1.25, least(3.75, p_position_y)),
    greatest(.55, least(1.65, p_scale)),
    greatest(-.30, least(.30, p_rotation_z)),
    jsonb_build_object('engine', 'beo-three-v1')
  ) on conflict (assignment_id) do update set
    frame_item_id = excluded.frame_item_id,
    wall_id = excluded.wall_id,
    position_x = excluded.position_x,
    position_y = excluded.position_y,
    scale = excluded.scale,
    rotation_z = excluded.rotation_z,
    layout_config = excluded.layout_config,
    updated_at = now()
  returning * into display_row;
  return to_jsonb(display_row);
end;
$$;

revoke all on function public.save_studio_artwork_transform(uuid,text,numeric,numeric,numeric,numeric,uuid) from public;
grant execute on function public.save_studio_artwork_transform(uuid,text,numeric,numeric,numeric,numeric,uuid) to authenticated;

-- Keep future assignment uploads spaced across the room instead of stacking at
-- the origin. The existing assignment trigger automatically uses this revision.
create or replace function public.reward_assignment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_slot integer;
  slot_index integer;
  wall_cell integer;
  became_reviewed boolean := false;
begin
  if tg_op = 'INSERT' then
    became_reviewed := new.reviewed;
    perform public.ensure_gamification_profile(new.student_id);
    select coalesce(max(wall_slot), 0) + 1 into next_slot
    from public.studio_displays where student_id = new.student_id;
    slot_index := next_slot - 1;
    wall_cell := slot_index / 3;
    insert into public.studio_displays (
      assignment_id, student_id, wall_slot, wall_id,
      position_x, position_y, scale, layout_config
    ) values (
      new.id, new.student_id, next_slot,
      'wall-' || chr(97 + (slot_index % 3)),
      case wall_cell % 4 when 0 then -1.2 when 1 then -.4 when 2 then .4 else 1.2 end,
      case (wall_cell / 4) % 3 when 0 then 3.35 when 1 then 2.35 else 1.35 end,
      .66,
      jsonb_build_object('engine', 'beo-three-v1')
    ) on conflict (assignment_id) do nothing;
    perform public.award_gamification_event(
      new.student_id, 'assignment_submitted', 'assignment', new.id::text,
      40, 10, 'assignment-submitted:' || new.id::text,
      jsonb_build_object('lesson_code', new.lesson_code)
    );
  else
    became_reviewed := new.reviewed and not old.reviewed;
  end if;

  if became_reviewed then
    perform public.award_gamification_event(
      new.student_id, 'assignment_reviewed', 'assignment', new.id::text,
      60, 15, 'assignment-reviewed:' || new.id::text,
      jsonb_build_object('lesson_code', new.lesson_code)
    );
    perform public.award_completed_lesson(new.student_id, new.lesson_code);
  end if;
  return new;
end;
$$;

-- Rewards now reflect the score and only the improvement on a retake.
-- First completion: 5 XP. Each newly reached correct-answer milestone: 5 XP + 1 brush.
-- A first perfect score also earns a 15 XP + 3 brush mastery bonus.
create or replace function public.reward_quiz_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prior_best integer := 0;
  milestone integer;
begin
  select coalesce(max(score), 0) into prior_best
  from public.quiz_submissions
  where student_id = new.student_id
    and lesson_code = new.lesson_code
    and id <> new.id;

  if not exists (
    select 1 from public.quiz_submissions
    where student_id = new.student_id and lesson_code = new.lesson_code and id <> new.id
  ) then
    perform public.award_gamification_event(
      new.student_id, 'quiz_submitted', 'lesson', new.lesson_code, 5, 0,
      'quiz-score-base:' || new.student_id::text || ':' || new.lesson_code,
      jsonb_build_object('attempt', new.attempt_number, 'score', new.score)
    );
  end if;

  if new.score > prior_best then
    for milestone in (prior_best + 1)..new.score loop
      perform public.award_gamification_event(
        new.student_id, 'quiz_score_improved', 'lesson', new.lesson_code, 5, 1,
        'quiz-score:' || new.student_id::text || ':' || new.lesson_code || ':' || milestone::text,
        jsonb_build_object('attempt', new.attempt_number, 'score_milestone', milestone)
      );
    end loop;
  end if;

  if new.score = 3 and prior_best < 3 then
    perform public.award_gamification_event(
      new.student_id, 'quiz_mastered', 'lesson', new.lesson_code, 15, 3,
      'quiz-perfect-v2:' || new.student_id::text || ':' || new.lesson_code,
      jsonb_build_object('attempt', new.attempt_number)
    );
  end if;

  perform public.award_completed_lesson(new.student_id, new.lesson_code);
  return new;
end;
$$;
