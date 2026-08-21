-- 009_strip_trailing_numbers_from_username.sql

-- ═══════════════════════════════════════════════════════════════════
-- 1. Actualizar la función handle_new_user()
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
declare
  v_email text;
  v_base_username text;
  v_username text;
  v_exists boolean;
  v_attempts int := 0;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  v_email := coalesce(new.email, '');
  v_base_username := split_part(v_email, '@', 1);
  v_base_username := lower(regexp_replace(v_base_username, '[^a-zA-Z0-9_]', '', 'g'));
  
  -- NUEVO: Eliminar números del final
  v_base_username := regexp_replace(v_base_username, '[0-9]+$', '');
  
  if length(v_base_username) < 3 then
    v_base_username := 'user';
  end if;

  v_base_username := left(v_base_username, 16);
  v_username := v_base_username;

  loop
    select exists(select 1 from public.profiles where username = v_username) into v_exists;
    
    if not v_exists then
      insert into public.profiles (id, username, is_public)
      values (new.id, v_username, true);
      return new;
    end if;

    v_attempts := v_attempts + 1;
    v_username := v_base_username || lpad(floor(random() * 10000)::text, 4, '0');
    
    if v_attempts > 50 then
      v_username := v_base_username || substr(new.id::text, 1, 8);
      insert into public.profiles (id, username, is_public)
      values (new.id, v_username, true);
      return new;
    end if;
  end loop;
end;
$$ language plpgsql;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Migrar perfiles existentes
-- ═══════════════════════════════════════════════════════════════════
do $$
declare
  r record;
  v_old_base text;
  v_new_base text;
  v_username text;
  v_exists boolean;
  v_attempts int;
begin
  for r in 
    select u.id, u.email, p.username 
    from auth.users u
    join public.profiles p on p.id = u.id
  loop
    v_old_base := split_part(coalesce(r.email, ''), '@', 1);
    v_old_base := lower(regexp_replace(v_old_base, '[^a-zA-Z0-9_]', '', 'g'));
    if length(v_old_base) < 3 then
      v_old_base := 'user';
    end if;
    v_old_base := left(v_old_base, 16);
    
    -- Si el username actual no empieza con la base vieja auto-generada, 
    -- asumimos que el usuario lo cambió a mano o se generó de otra forma.
    if r.username not like v_old_base || '%' then
      continue;
    end if;

    v_new_base := split_part(coalesce(r.email, ''), '@', 1);
    v_new_base := lower(regexp_replace(v_new_base, '[^a-zA-Z0-9_]', '', 'g'));
    v_new_base := regexp_replace(v_new_base, '[0-9]+$', '');
    if length(v_new_base) < 3 then
      v_new_base := 'user';
    end if;
    v_new_base := left(v_new_base, 16);

    -- Si no hay diferencia (no había números al final), no hacemos nada
    if v_new_base = v_old_base then
      continue;
    end if;
    
    -- Buscar un username libre con la nueva base
    v_username := v_new_base;
    v_attempts := 0;
    
    loop
      -- Comprobar si el username propuesto ya existe y NO es del propio usuario
      select exists(
        select 1 from public.profiles 
        where username = v_username and id != r.id
      ) into v_exists;
      
      if not v_exists then
        update public.profiles set username = v_username where id = r.id;
        exit;
      end if;
      
      v_attempts := v_attempts + 1;
      v_username := v_new_base || lpad(floor(random() * 10000)::text, 4, '0');
      
      if v_attempts > 50 then
        v_username := v_new_base || substr(r.id::text, 1, 8);
        update public.profiles set username = v_username where id = r.id;
        exit;
      end if;
    end loop;
  end loop;
end;
$$;
