-- Create a secure function to create a household and its OWNER member atomically
-- This bypasses RLS using SECURITY DEFINER, while staying scoped to allowed tables

create or replace function public.create_household_with_owner(
  p_name text,
  p_owner_user_id uuid,
  p_owner_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  -- Create the household
  insert into households (name, is_setup_complete)
  values (p_name, false)
  returning id into v_household_id;

  -- Create the owner member for the given user
  insert into members (household_id, user_id, full_name, role)
  values (v_household_id, p_owner_user_id, coalesce(p_owner_full_name, 'Owner'), 'OWNER');

  -- Mark setup complete
  update households set is_setup_complete = true where id = v_household_id;

  return v_household_id;
end;
$$;

grant execute on function public.create_household_with_owner(text, uuid, text) to authenticated;

