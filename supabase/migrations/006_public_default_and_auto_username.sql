-- 006_public_default_and_auto_username.sql

-- ═══════════════════════════════════════════════════════════════════
-- 1. Cambiar el default de is_public de false a true
-- ═══════════════════════════════════════════════════════════════════
alter table public.profiles alter column is_public set default true;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Actualizar los perfiles existentes que nunca han tocado su 
--    configuración: poner is_public = true a todos.
--    (Esto es seguro porque quien ya lo cambió manualmente a false
--     lo hizo intencionalmente y queremos respetar eso... pero 
--     como dijiste "todo el mundo en público", actualizamos todos.)
-- ═══════════════════════════════════════════════════════════════════
update public.profiles set is_public = true where is_public = false;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Función y trigger para auto-crear perfil al registrarse
--    - Username = parte antes del @ del email
--    - Solo caracteres alfanuméricos y guiones bajos (sanitizado)
--    - Si hay duplicado, se añade un número aleatorio de 4 cifras
--    - No toca perfiles que ya existan (respeta los que ya 
--      han cambiado su @)
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
  -- Solo crear perfil si no existe ya uno para este usuario
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  v_email := coalesce(new.email, '');

  -- Extraer la parte antes del @
  v_base_username := split_part(v_email, '@', 1);
  
  -- Sanitizar: solo letras, números y guiones bajos, minúsculas
  v_base_username := lower(regexp_replace(v_base_username, '[^a-zA-Z0-9_]', '', 'g'));
  
  -- Si quedó vacío o muy corto, usar un fallback
  if length(v_base_username) < 3 then
    v_base_username := 'user';
  end if;

  -- Truncar a 16 chars para dejar espacio al sufijo numérico (max username = 20)
  v_base_username := left(v_base_username, 16);
  
  -- Intentar con el username base primero
  v_username := v_base_username;

  loop
    select exists(select 1 from public.profiles where username = v_username) into v_exists;
    
    if not v_exists then
      -- Username disponible, insertar
      insert into public.profiles (id, username, is_public)
      values (new.id, v_username, true);
      return new;
    end if;

    -- Si existe, añadir sufijo aleatorio de 4 dígitos
    v_attempts := v_attempts + 1;
    v_username := v_base_username || lpad(floor(random() * 10000)::text, 4, '0');
    
    -- Límite de seguridad para evitar bucles infinitos
    if v_attempts > 50 then
      -- Fallback extremo: usar parte del UUID
      v_username := v_base_username || substr(new.id::text, 1, 8);
      insert into public.profiles (id, username, is_public)
      values (new.id, v_username, true);
      return new;
    end if;
  end loop;
end;
$$ language plpgsql;

-- Crear el trigger en auth.users para nuevos registros
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- 4. Rellenar perfiles para usuarios existentes que NO tienen perfil
--    (por si hay usuarios registrados sin perfil creado)
-- ═══════════════════════════════════════════════════════════════════

-- Esto se hace como una función temporal para poder manejar la 
-- lógica de duplicados
do $$
declare
  r record;
  v_base_username text;
  v_username text;
  v_exists boolean;
  v_attempts int;
begin
  for r in 
    select u.id, u.email 
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    v_base_username := split_part(coalesce(r.email, ''), '@', 1);
    v_base_username := lower(regexp_replace(v_base_username, '[^a-zA-Z0-9_]', '', 'g'));
    
    if length(v_base_username) < 3 then
      v_base_username := 'user';
    end if;
    
    v_base_username := left(v_base_username, 16);
    v_username := v_base_username;
    v_attempts := 0;
    
    loop
      select exists(select 1 from public.profiles where username = v_username) into v_exists;
      
      if not v_exists then
        insert into public.profiles (id, username, is_public)
        values (r.id, v_username, true);
        exit;
      end if;
      
      v_attempts := v_attempts + 1;
      v_username := v_base_username || lpad(floor(random() * 10000)::text, 4, '0');
      
      if v_attempts > 50 then
        v_username := v_base_username || substr(r.id::text, 1, 8);
        insert into public.profiles (id, username, is_public)
        values (r.id, v_username, true);
        exit;
      end if;
    end loop;
  end loop;
end;
$$;
