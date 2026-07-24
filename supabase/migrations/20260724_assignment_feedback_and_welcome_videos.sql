alter table public.assignments
  add column if not exists seen_at timestamptz,
  add column if not exists feedback text,
  add column if not exists feedback_at timestamptz;

create table if not exists public.track_welcome_videos (
  track public.learning_track primary key,
  title text not null,
  youtube_video_id text,
  description text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.track_welcome_videos enable row level security;

drop policy if exists "Students read their welcome video" on public.track_welcome_videos;
create policy "Students read their welcome video" on public.track_welcome_videos for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.payment_status = 'active' and (p.track = track_welcome_videos.track or p.role = 'admin'))
);
drop policy if exists "Admins insert welcome videos" on public.track_welcome_videos;
create policy "Admins insert welcome videos" on public.track_welcome_videos for insert with check (public.is_admin());
drop policy if exists "Admins update welcome videos" on public.track_welcome_videos;
create policy "Admins update welcome videos" on public.track_welcome_videos for update using (public.is_admin()) with check (public.is_admin());

insert into public.track_welcome_videos (track, title, description) values
('Discovery', 'Welcome to Discovery', 'Begin here before opening your first lesson.'),
('Drawing', 'Welcome to Drawing Guided', 'Your orientation to the drawing studio and weekly learning rhythm.'),
('Painting', 'Welcome to Painting Guided', 'Your orientation to materials, practice, and the painting studio.')
on conflict (track) do nothing;
