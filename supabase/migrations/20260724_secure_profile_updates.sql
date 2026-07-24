-- Allows a logged-in user to update only their own display name.
-- It avoids broad profile UPDATE access that could permit role escalation.
create or replace function public.update_own_profile_name(new_name text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(new_name)) < 2 or char_length(trim(new_name)) > 80 then
    raise exception 'Name must be between 2 and 80 characters';
  end if;
  update public.profiles set name = trim(new_name) where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile_name(text) from public;
grant execute on function public.update_own_profile_name(text) to authenticated;
