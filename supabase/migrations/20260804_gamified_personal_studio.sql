-- Beo School of Art: gamified Studio Journey and Personal Studio.
-- Run after 20260729_school_completion_and_operations.sql and the curriculum seed.

create table if not exists public.artist_levels (
  level smallint primary key check (level between 1 and 20),
  title text not null unique,
  min_xp integer not null unique check (min_xp >= 0)
);

insert into public.artist_levels (level, title, min_xp) values
  (1, 'Curious Observer', 0),
  (2, 'Mark Maker', 250),
  (3, 'Skill Builder', 700),
  (4, 'Developing Artist', 1500),
  (5, 'Studio Artist', 2800),
  (6, 'Beo Graduate', 4500)
on conflict (level) do update set title = excluded.title, min_xp = excluded.min_xp;

create table if not exists public.gamification_profiles (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  lifetime_xp integer not null default 0 check (lifetime_xp >= 0),
  gold_brush_balance integer not null default 0 check (gold_brush_balance >= 0),
  current_level smallint not null default 1 references public.artist_levels(level),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  related_type text,
  related_id text,
  xp_delta integer not null default 0,
  gold_brush_delta integer not null default 0,
  dedupe_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (xp_delta <> 0 or gold_brush_delta <> 0)
);

create index if not exists reward_ledger_student_created_idx
  on public.reward_ledger (student_id, created_at desc);
create index if not exists reward_ledger_event_idx
  on public.reward_ledger (event_type, created_at desc);

create table if not exists public.studio_catalog_items (
  id uuid primary key default gen_random_uuid(),
  item_key text not null unique,
  category text not null check (category in ('frame', 'theme', 'decor', 'resource', 'challenge')),
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  minimum_level smallint not null default 1 references public.artist_levels(level),
  visual_config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_inventory (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.studio_catalog_items(id) on delete restrict,
  acquisition_source text not null default 'purchase',
  ledger_id uuid references public.reward_ledger(id) on delete set null,
  acquired_at timestamptz not null default now(),
  unique (student_id, item_id)
);

create table if not exists public.student_studios (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  selected_theme_id uuid references public.studio_catalog_items(id) on delete set null,
  layout_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_displays (
  assignment_id uuid primary key references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  frame_item_id uuid references public.studio_catalog_items(id) on delete set null,
  wall_slot integer,
  layout_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, wall_slot)
);

create index if not exists studio_displays_student_idx
  on public.studio_displays (student_id, created_at);

create table if not exists public.lesson_game_challenges (
  id uuid primary key default gen_random_uuid(),
  lesson_code text not null references public.lessons(lesson_code) on delete cascade,
  challenge_type text not null check (challenge_type in ('quick_choice', 'sequence', 'sort_match', 'value_order')),
  title text not null default 'Studio Challenge',
  prompt text not null,
  version integer not null default 1 check (version > 0),
  challenge_config jsonb not null,
  explanation text not null default '',
  reward_xp integer not null default 20 check (reward_xp between 0 and 500),
  reward_brushes integer not null default 5 check (reward_brushes between 0 and 200),
  is_mastery boolean not null default false,
  approved boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_code, version)
);

create index if not exists lesson_game_challenges_active_idx
  on public.lesson_game_challenges (lesson_code) where active and approved;

create table if not exists public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.lesson_game_challenges(id) on delete cascade,
  challenge_version integer not null,
  attempt_number integer not null check (attempt_number > 0),
  submitted_response jsonb not null,
  is_correct boolean not null,
  correction_completed boolean not null default false,
  completed_at timestamptz not null default now(),
  unique (student_id, challenge_id, attempt_number)
);

create index if not exists game_attempts_student_idx
  on public.game_attempts (student_id, challenge_id, completed_at desc);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  achievement_key text not null unique,
  name text not null,
  description text not null,
  icon_key text not null default 'award',
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.student_achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (student_id, achievement_id)
);

create table if not exists public.gamification_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  weekly_grace_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.gamification_settings (id, enabled)
values (true, true)
on conflict (id) do nothing;

insert into public.achievements (achievement_key, name, description, icon_key, sort_order) values
  ('first_check', 'First Check', 'Complete your first knowledge check.', 'check', 10),
  ('wall_starter', 'Wall Starter', 'Submit your first artwork to the Personal Studio.', 'image', 20),
  ('review_ready', 'Review Ready', 'Complete your first assignment review.', 'message', 30),
  ('practice_rhythm', 'Practice Rhythm', 'Fully complete three lessons.', 'flame', 40),
  ('studio_builder', 'Studio Builder', 'Add three purchased items to your studio inventory.', 'palette', 50),
  ('drawing_graduate', 'Drawing Graduate', 'Complete the Drawing Track.', 'certificate', 60),
  ('painting_graduate', 'Painting Graduate', 'Complete the Painting Track.', 'certificate', 70),
  ('discovery_graduate', 'Discovery Graduate', 'Complete the Discovery Track.', 'certificate', 80)
on conflict (achievement_key) do update set
  name = excluded.name,
  description = excluded.description,
  icon_key = excluded.icon_key,
  sort_order = excluded.sort_order;

insert into public.studio_catalog_items (item_key, category, name, description, price, minimum_level, visual_config, sort_order) values
  ('classic-gold', 'frame', 'Classic Gold', 'A warm gallery frame in Beo gold.', 25, 1, '{"className":"frame-classic-gold"}', 10),
  ('deep-walnut', 'frame', 'Deep Walnut', 'A grounded wooden frame for observational work.', 30, 1, '{"className":"frame-deep-walnut"}', 20),
  ('gallery-black', 'frame', 'Gallery Black', 'A clean contemporary frame with a narrow edge.', 35, 1, '{"className":"frame-gallery-black"}', 30),
  ('ivory-mat', 'frame', 'Ivory Mat', 'A generous warm-white mount for finished studies.', 45, 2, '{"className":"frame-ivory-mat"}', 40),
  ('artist-brush', 'frame', 'Artist Brush', 'A hand-painted frame inspired by studio marks.', 55, 3, '{"className":"frame-artist-brush"}', 50),
  ('graduate-gold', 'frame', 'Graduate Gold', 'A distinguished frame for accomplished artists.', 90, 5, '{"className":"frame-graduate-gold"}', 60),
  ('charcoal-wall', 'theme', 'Charcoal Wall', 'A quiet charcoal gallery wall.', 60, 2, '{"className":"studio-theme-charcoal"}', 110),
  ('warm-atelier', 'theme', 'Warm Atelier', 'A warm studio wall inspired by natural canvas.', 75, 3, '{"className":"studio-theme-atelier"}', 120),
  ('midnight-gallery', 'theme', 'Midnight Gallery', 'A deep blue gallery with subtle gold light.', 100, 4, '{"className":"studio-theme-midnight"}', 130),
  ('easel', 'decor', 'Studio Easel', 'Place a working easel in your studio.', 40, 1, '{"icon":"easel"}', 210),
  ('brush-jar', 'decor', 'Brush Jar', 'A full jar of well-used studio brushes.', 30, 1, '{"icon":"brush"}', 220),
  ('studio-plant', 'decor', 'Studio Plant', 'A calm green companion for your practice.', 45, 2, '{"icon":"plant"}', 230),
  ('paint-shelf', 'decor', 'Paint Shelf', 'A shelf of colour ready for the next study.', 55, 2, '{"icon":"paint"}', 240),
  ('gallery-lamp', 'decor', 'Gallery Lamp', 'A focused light for the assignment wall.', 65, 3, '{"icon":"lamp"}', 250),
  ('graduate-plaque', 'decor', 'Graduate Plaque', 'A studio plaque unlocked for advanced artists.', 100, 5, '{"icon":"award"}', 260),
  ('portrait-prompts', 'resource', 'Portrait Prompt Deck', 'A set of portrait ideas for independent practice.', 35, 2, '{"href":"/resources#portrait-prompts"}', 310),
  ('object-reference-pack', 'resource', 'Object Reference Pack', 'Everyday forms selected for observational drawing.', 30, 1, '{"href":"/resources#object-reference-pack"}', 320),
  ('colour-palette-cards', 'resource', 'Colour Palette Cards', 'Practice palettes for controlled colour decisions.', 45, 2, '{"href":"/resources#colour-palette-cards"}', 330)
on conflict (item_key) do update set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  minimum_level = excluded.minimum_level,
  visual_config = excluded.visual_config,
  sort_order = excluded.sort_order;

-- Seed one approved challenge per lesson from Benjamin's verified question bank.
-- The correct answer remains server-only; student clients receive a sanitised config.
insert into public.lesson_game_challenges (
  lesson_code,
  challenge_type,
  title,
  prompt,
  version,
  challenge_config,
  explanation,
  reward_xp,
  reward_brushes,
  approved,
  active
)
select
  l.lesson_code,
  'quick_choice',
  l.lesson_code || ' Studio Challenge',
  q.question_text,
  1,
  jsonb_build_object(
    'options', jsonb_build_array(
      jsonb_build_object('id', 'a', 'label', q.option_a),
      jsonb_build_object('id', 'b', 'label', q.option_b),
      jsonb_build_object('id', 'c', 'label', q.option_c),
      jsonb_build_object('id', 'd', 'label', q.option_d)
    ),
    'correct_answer', q.correct_answer
  ),
  coalesce(nullif(q.correct_answer_text, ''), 'Review the lesson notes and try the challenge again.'),
  20,
  5,
  true,
  true
from public.lessons l
join lateral (
  select * from public.quiz_questions qq
  where qq.lesson_code = l.lesson_code
  order by qq.question_order, qq.created_at
  limit 1
) q on true
on conflict (lesson_code, version) do nothing;

-- Fresh projects often seed curriculum after migrations. Keep challenge coverage
-- automatic by creating the first lesson challenge when its first quiz row arrives.
create or replace function public.seed_lesson_game_challenge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.lesson_game_challenges
    where lesson_code = new.lesson_code and version = 1
  ) then
    return new;
  end if;

  if coalesce(new.question_order, 1) <> 1 then
    return new;
  end if;

  insert into public.lesson_game_challenges (
    lesson_code, challenge_type, title, prompt, version, challenge_config,
    explanation, reward_xp, reward_brushes, approved, active
  ) values (
    new.lesson_code,
    'quick_choice',
    new.lesson_code || ' Studio Challenge',
    new.question_text,
    1,
    jsonb_build_object(
      'options', jsonb_build_array(
        jsonb_build_object('id', 'a', 'label', new.option_a),
        jsonb_build_object('id', 'b', 'label', new.option_b),
        jsonb_build_object('id', 'c', 'label', new.option_c),
        jsonb_build_object('id', 'd', 'label', new.option_d)
      ),
      'correct_answer', new.correct_answer
    ),
    coalesce(nullif(new.correct_answer_text, ''), 'Review the lesson notes and try the challenge again.'),
    20, 5, true, true
  ) on conflict (lesson_code, version) do nothing;
  return new;
end;
$$;

drop trigger if exists seed_lesson_game_challenge_after_question on public.quiz_questions;
create trigger seed_lesson_game_challenge_after_question
after insert or update of question_text, option_a, option_b, option_c, option_d, correct_answer, correct_answer_text
on public.quiz_questions for each row execute function public.seed_lesson_game_challenge();

create or replace function public.artist_level_for_xp(p_xp integer)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(level), 1)::smallint
  from public.artist_levels
  where min_xp <= greatest(p_xp, 0);
$$;

create or replace function public.ensure_gamification_profile(p_student_id uuid)
returns public.gamification_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.gamification_profiles;
begin
  insert into public.gamification_profiles (student_id)
  values (p_student_id)
  on conflict (student_id) do nothing;

  insert into public.student_studios (student_id)
  values (p_student_id)
  on conflict (student_id) do nothing;

  select * into result
  from public.gamification_profiles
  where student_id = p_student_id;
  return result;
end;
$$;

create or replace function public.evaluate_student_achievements(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_achievements (student_id, achievement_id)
  select p_student_id, a.id
  from public.achievements a
  where a.achievement_key = 'first_check'
    and exists (select 1 from public.quiz_submissions q where q.student_id = p_student_id)
  on conflict do nothing;

  insert into public.student_achievements (student_id, achievement_id)
  select p_student_id, a.id
  from public.achievements a
  where a.achievement_key = 'wall_starter'
    and exists (select 1 from public.assignments x where x.student_id = p_student_id)
  on conflict do nothing;

  insert into public.student_achievements (student_id, achievement_id)
  select p_student_id, a.id
  from public.achievements a
  where a.achievement_key = 'review_ready'
    and exists (select 1 from public.assignments x where x.student_id = p_student_id and x.reviewed)
  on conflict do nothing;

  insert into public.student_achievements (student_id, achievement_id)
  select p_student_id, a.id
  from public.achievements a
  where a.achievement_key = 'practice_rhythm'
    and (select count(*) from public.reward_ledger r where r.student_id = p_student_id and r.event_type = 'lesson_complete') >= 3
  on conflict do nothing;

  insert into public.student_achievements (student_id, achievement_id)
  select p_student_id, a.id
  from public.achievements a
  where a.achievement_key = 'studio_builder'
    and (select count(*) from public.student_inventory i where i.student_id = p_student_id) >= 3
  on conflict do nothing;

  insert into public.student_achievements (student_id, achievement_id, metadata)
  select p_student_id, a.id, jsonb_build_object('track', c.track)
  from public.certificates c
  join public.achievements a on a.achievement_key = case c.track
    when 'Drawing'::public.learning_track then 'drawing_graduate'
    when 'Painting'::public.learning_track then 'painting_graduate'
    else 'discovery_graduate'
  end
  where c.student_id = p_student_id
  on conflict do nothing;
end;
$$;

create or replace function public.award_gamification_event(
  p_student_id uuid,
  p_event_type text,
  p_related_type text,
  p_related_id text,
  p_xp integer,
  p_gold_brushes integer,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ledger_row public.reward_ledger;
  profile_row public.gamification_profiles;
  today_lagos date := (now() at time zone 'Africa/Lagos')::date;
  this_week date := date_trunc('week', now() at time zone 'Africa/Lagos')::date;
  previous_week date;
  next_streak integer;
begin
  perform public.ensure_gamification_profile(p_student_id);

  if exists (select 1 from public.gamification_settings where id = true and enabled = false) then
    select * into profile_row from public.gamification_profiles where student_id = p_student_id;
    return jsonb_build_object('awarded', false, 'disabled', true, 'profile', to_jsonb(profile_row));
  end if;

  if p_xp < 0 or p_gold_brushes < 0 then
    raise exception 'Award values cannot be negative';
  end if;
  if p_xp = 0 and p_gold_brushes = 0 then
    raise exception 'Reward must contain XP or Gold Brushes';
  end if;
  if not exists (select 1 from public.profiles where id = p_student_id) then
    raise exception 'Student profile not found';
  end if;

  insert into public.reward_ledger (
    student_id, event_type, related_type, related_id, xp_delta,
    gold_brush_delta, dedupe_key, metadata
  ) values (
    p_student_id, p_event_type, p_related_type, p_related_id, p_xp,
    p_gold_brushes, p_dedupe_key, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (dedupe_key) do nothing
  returning * into ledger_row;

  if ledger_row.id is null then
    select * into profile_row from public.gamification_profiles where student_id = p_student_id;
    return jsonb_build_object('awarded', false, 'profile', to_jsonb(profile_row));
  end if;

  select date_trunc('week', last_activity_on::timestamp)::date
  into previous_week
  from public.gamification_profiles
  where student_id = p_student_id
  for update;

  select case
    when previous_week is null then 1
    when previous_week = this_week then current_streak
    when previous_week = this_week - 7 then current_streak + 1
    else 1
  end
  into next_streak
  from public.gamification_profiles
  where student_id = p_student_id;

  update public.gamification_profiles
  set lifetime_xp = lifetime_xp + p_xp,
      gold_brush_balance = gold_brush_balance + p_gold_brushes,
      current_level = public.artist_level_for_xp(lifetime_xp + p_xp),
      current_streak = next_streak,
      longest_streak = greatest(longest_streak, next_streak),
      last_activity_on = today_lagos,
      updated_at = now()
  where student_id = p_student_id
  returning * into profile_row;

  perform public.evaluate_student_achievements(p_student_id);
  return jsonb_build_object('awarded', true, 'ledger', to_jsonb(ledger_row), 'profile', to_jsonb(profile_row));
end;
$$;

create or replace function public.award_completed_lesson(p_student_id uuid, p_lesson_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.quiz_submissions q
    where q.student_id = p_student_id and q.lesson_code = p_lesson_code
  ) and exists (
    select 1 from public.assignments a
    where a.student_id = p_student_id and a.lesson_code = p_lesson_code and a.reviewed
  ) then
    perform public.award_gamification_event(
      p_student_id,
      'lesson_complete',
      'lesson',
      p_lesson_code,
      50,
      15,
      'lesson-complete:' || p_student_id::text || ':' || p_lesson_code,
      '{}'::jsonb
    );
  end if;
end;
$$;

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
  perform public.award_completed_lesson(new.student_id, new.lesson_code);
  return new;
end;
$$;

drop trigger if exists gamification_quiz_reward on public.quiz_submissions;
create trigger gamification_quiz_reward
after insert on public.quiz_submissions
for each row execute function public.reward_quiz_submission();

create or replace function public.reward_assignment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_slot integer;
  became_reviewed boolean := false;
begin
  if tg_op = 'INSERT' then
    became_reviewed := new.reviewed;
    perform public.ensure_gamification_profile(new.student_id);
    select coalesce(max(wall_slot), 0) + 1 into next_slot
    from public.studio_displays where student_id = new.student_id;
    insert into public.studio_displays (assignment_id, student_id, wall_slot)
    values (new.id, new.student_id, next_slot)
    on conflict (assignment_id) do nothing;
    perform public.award_gamification_event(
      new.student_id,
      'assignment_submitted',
      'assignment',
      new.id::text,
      40,
      10,
      'assignment-submitted:' || new.id::text,
      jsonb_build_object('lesson_code', new.lesson_code)
    );
  else
    became_reviewed := new.reviewed and not old.reviewed;
  end if;

  if became_reviewed then
    perform public.award_gamification_event(
      new.student_id,
      'assignment_reviewed',
      'assignment',
      new.id::text,
      60,
      15,
      'assignment-reviewed:' || new.id::text,
      jsonb_build_object('lesson_code', new.lesson_code)
    );
    perform public.award_completed_lesson(new.student_id, new.lesson_code);
  end if;
  return new;
end;
$$;

drop trigger if exists gamification_assignment_insert on public.assignments;
create trigger gamification_assignment_insert
after insert on public.assignments
for each row execute function public.reward_assignment_event();

drop trigger if exists gamification_assignment_review on public.assignments;
create trigger gamification_assignment_review
after update of reviewed on public.assignments
for each row
when (new.reviewed and not old.reviewed)
execute function public.reward_assignment_event();

create or replace function public.reward_certificate_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_gamification_event(
    new.student_id,
    'track_completed',
    'certificate',
    new.id::text,
    300,
    100,
    'track-completed:' || new.student_id::text || ':' || new.track::text,
    jsonb_build_object('track', new.track)
  );
  return new;
end;
$$;

drop trigger if exists gamification_certificate_reward on public.certificates;
create trigger gamification_certificate_reward
after insert on public.certificates
for each row execute function public.reward_certificate_event();

create or replace function public.initialise_student_gamification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ensure_gamification_profile(new.id);
  return new;
end;
$$;

drop trigger if exists initialise_student_gamification_profile on public.profiles;
create trigger initialise_student_gamification_profile
after insert on public.profiles
for each row execute function public.initialise_student_gamification();

create or replace function public.purchase_studio_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid := auth.uid();
  item public.studio_catalog_items;
  profile_row public.gamification_profiles;
  ledger_row public.reward_ledger;
  inventory_row public.student_inventory;
begin
  if student is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.gamification_settings where id = true and enabled = false) then
    raise exception 'The Reward Shop is temporarily paused';
  end if;
  perform public.ensure_gamification_profile(student);

  select * into item from public.studio_catalog_items where id = p_item_id and active;
  if item.id is null then raise exception 'Studio item is unavailable'; end if;
  if exists (select 1 from public.student_inventory where student_id = student and item_id = item.id) then
    raise exception 'You already own this studio item';
  end if;

  select * into profile_row from public.gamification_profiles where student_id = student for update;
  if profile_row.current_level < item.minimum_level then raise exception 'Your artist level is not high enough yet'; end if;
  if profile_row.gold_brush_balance < item.price then raise exception 'Not enough Gold Brushes'; end if;

  insert into public.reward_ledger (
    student_id, event_type, related_type, related_id,
    xp_delta, gold_brush_delta, dedupe_key, metadata
  ) values (
    student, 'studio_purchase', 'catalog_item', item.id::text,
    0, -item.price, 'studio-purchase:' || student::text || ':' || item.id::text,
    jsonb_build_object('item_key', item.item_key, 'price', item.price)
  ) returning * into ledger_row;

  update public.gamification_profiles
  set gold_brush_balance = gold_brush_balance - item.price, updated_at = now()
  where student_id = student
  returning * into profile_row;

  insert into public.student_inventory (student_id, item_id, ledger_id)
  values (student, item.id, ledger_row.id)
  returning * into inventory_row;

  perform public.evaluate_student_achievements(student);
  return jsonb_build_object('item', to_jsonb(item), 'inventory', to_jsonb(inventory_row), 'profile', to_jsonb(profile_row));
exception when unique_violation then
  raise exception 'You already own this studio item';
end;
$$;

create or replace function public.set_assignment_frame(p_assignment_id uuid, p_item_id uuid default null)
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
  if not exists (select 1 from public.assignments where id = p_assignment_id and student_id = student) then
    raise exception 'Assignment not found';
  end if;
  if p_item_id is not null and not exists (
    select 1 from public.student_inventory i
    join public.studio_catalog_items c on c.id = i.item_id
    where i.student_id = student and i.item_id = p_item_id and c.category = 'frame' and c.active
  ) then
    raise exception 'You do not own this frame';
  end if;

  insert into public.studio_displays (assignment_id, student_id, frame_item_id)
  values (p_assignment_id, student, p_item_id)
  on conflict (assignment_id) do update
  set frame_item_id = excluded.frame_item_id, updated_at = now()
  returning * into display_row;
  return to_jsonb(display_row);
end;
$$;

create or replace function public.set_studio_theme(p_item_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid := auth.uid();
  studio_row public.student_studios;
begin
  if student is null then raise exception 'Authentication required'; end if;
  perform public.ensure_gamification_profile(student);
  if p_item_id is not null and not exists (
    select 1 from public.student_inventory i
    join public.studio_catalog_items c on c.id = i.item_id
    where i.student_id = student and i.item_id = p_item_id and c.category = 'theme' and c.active
  ) then
    raise exception 'You do not own this studio theme';
  end if;

  update public.student_studios
  set selected_theme_id = p_item_id, updated_at = now()
  where student_id = student
  returning * into studio_row;
  return to_jsonb(studio_row);
end;
$$;

-- RLS: student records are private; catalog and levels are readable to signed-in students.
alter table public.artist_levels enable row level security;
alter table public.gamification_profiles enable row level security;
alter table public.reward_ledger enable row level security;
alter table public.studio_catalog_items enable row level security;
alter table public.student_inventory enable row level security;
alter table public.student_studios enable row level security;
alter table public.studio_displays enable row level security;
alter table public.lesson_game_challenges enable row level security;
alter table public.game_attempts enable row level security;
alter table public.achievements enable row level security;
alter table public.student_achievements enable row level security;
alter table public.gamification_settings enable row level security;

create policy "Authenticated read artist levels" on public.artist_levels for select to authenticated using (true);
create policy "Students read own game profile" on public.gamification_profiles for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "Students read own reward ledger" on public.reward_ledger for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "Authenticated read active studio catalog" on public.studio_catalog_items for select to authenticated using (active or public.is_admin());
create policy "Admins manage studio catalog" on public.studio_catalog_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Students read own inventory" on public.student_inventory for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "Students read own studio" on public.student_studios for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "Students read own studio displays" on public.studio_displays for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "Admins manage challenges" on public.lesson_game_challenges for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Students read own game attempts" on public.game_attempts for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "Authenticated read achievements" on public.achievements for select to authenticated using (active or public.is_admin());
create policy "Admins manage achievements" on public.achievements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Students read own achievements" on public.student_achievements for select to authenticated using (student_id = auth.uid() or public.is_admin());
create policy "Authenticated read gamification setting" on public.gamification_settings for select to authenticated using (true);
create policy "Admins manage gamification setting" on public.gamification_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on function public.purchase_studio_item(uuid) from public;
revoke all on function public.set_assignment_frame(uuid, uuid) from public;
revoke all on function public.set_studio_theme(uuid) from public;
revoke all on function public.award_gamification_event(uuid, text, text, text, integer, integer, text, jsonb) from public;
grant execute on function public.purchase_studio_item(uuid) to authenticated;
grant execute on function public.set_assignment_frame(uuid, uuid) to authenticated;
grant execute on function public.set_studio_theme(uuid) to authenticated;
grant execute on function public.award_gamification_event(uuid, text, text, text, integer, integer, text, jsonb) to service_role;

-- Idempotent historical backfill. It uses the same dedupe keys as live triggers.
do $$
declare
  student record;
  quiz record;
  assignment_row record;
  lesson_row record;
  certificate_row record;
  next_slot integer;
begin
  for student in select id from public.profiles where role = 'student' loop
    perform public.ensure_gamification_profile(student.id);

    for quiz in
      select distinct on (lesson_code) lesson_code, attempt_number, score
      from public.quiz_submissions
      where student_id = student.id
      order by lesson_code, submitted_at
    loop
      perform public.award_gamification_event(
        student.id, 'quiz_submitted', 'lesson', quiz.lesson_code, 20, 5,
        'quiz-first:' || student.id::text || ':' || quiz.lesson_code,
        jsonb_build_object('attempt', quiz.attempt_number, 'score', quiz.score, 'backfilled', true)
      );
    end loop;

    next_slot := 0;
    for assignment_row in
      select id, lesson_code, reviewed from public.assignments
      where student_id = student.id order by submitted_at
    loop
      next_slot := next_slot + 1;
      insert into public.studio_displays (assignment_id, student_id, wall_slot)
      values (assignment_row.id, student.id, next_slot)
      on conflict (assignment_id) do nothing;
      perform public.award_gamification_event(
        student.id, 'assignment_submitted', 'assignment', assignment_row.id::text, 40, 10,
        'assignment-submitted:' || assignment_row.id::text,
        jsonb_build_object('lesson_code', assignment_row.lesson_code, 'backfilled', true)
      );
      if assignment_row.reviewed then
        perform public.award_gamification_event(
          student.id, 'assignment_reviewed', 'assignment', assignment_row.id::text, 60, 15,
          'assignment-reviewed:' || assignment_row.id::text,
          jsonb_build_object('lesson_code', assignment_row.lesson_code, 'backfilled', true)
        );
      end if;
    end loop;

    for lesson_row in
      select l.lesson_code
      from public.lessons l
      where exists (select 1 from public.quiz_submissions q where q.student_id = student.id and q.lesson_code = l.lesson_code)
        and exists (select 1 from public.assignments a where a.student_id = student.id and a.lesson_code = l.lesson_code and a.reviewed)
    loop
      perform public.award_completed_lesson(student.id, lesson_row.lesson_code);
    end loop;

    for certificate_row in select id, track from public.certificates where student_id = student.id loop
      perform public.award_gamification_event(
        student.id, 'track_completed', 'certificate', certificate_row.id::text, 300, 100,
        'track-completed:' || student.id::text || ':' || certificate_row.track::text,
        jsonb_build_object('track', certificate_row.track, 'backfilled', true)
      );
    end loop;
    perform public.evaluate_student_achievements(student.id);
  end loop;
end $$;

create or replace view public.gamification_backfill_audit
with (security_invoker = true)
as
select
  p.id as student_id,
  p.name,
  gp.lifetime_xp,
  gp.gold_brush_balance,
  gp.current_level,
  count(distinct r.id) as ledger_events,
  count(distinct d.assignment_id) as displayed_assignments,
  count(distinct a.id) as actual_assignments
from public.profiles p
left join public.gamification_profiles gp on gp.student_id = p.id
left join public.reward_ledger r on r.student_id = p.id
left join public.studio_displays d on d.student_id = p.id
left join public.assignments a on a.student_id = p.id
where p.role = 'student'
group by p.id, p.name, gp.lifetime_xp, gp.gold_brush_balance, gp.current_level;
