-- Keep every framed assignment fully inside its allocated wall panel.
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
  safe_scale numeric := greatest(.55, least(1.65, p_scale));
  horizontal_limit numeric;
begin
  if student is null then raise exception 'Authentication required'; end if;
  if p_wall_id not in ('wall-a', 'wall-b', 'wall-c') then raise exception 'Unknown studio wall'; end if;
  if not exists (select 1 from public.assignments where id = p_assignment_id and student_id = student) then raise exception 'Assignment not found'; end if;
  if p_frame_item_id is not null and not exists (
    select 1 from public.student_inventory i
    join public.studio_catalog_items c on c.id = i.item_id
    where i.student_id = student and i.item_id = p_frame_item_id and c.category = 'frame' and c.active
  ) then raise exception 'You do not own this frame'; end if;
  horizontal_limit := greatest(.46, 1.52 - (.63 * safe_scale));

  insert into public.studio_displays (
    assignment_id, student_id, frame_item_id, wall_id,
    position_x, position_y, scale, rotation_z, layout_config
  ) values (
    p_assignment_id, student, p_frame_item_id, p_wall_id,
    greatest(-horizontal_limit, least(horizontal_limit, p_position_x)),
    greatest(.85 + (.75 * safe_scale), least(3.62, p_position_y)),
    safe_scale,
    greatest(-.30, least(.30, p_rotation_z)),
    jsonb_build_object('engine', 'beo-three-v2')
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
