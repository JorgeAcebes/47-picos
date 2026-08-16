-- 005_login_by_username.sql

-- Buscamos el email asociado a un nombre de usuario.
-- Nota: Supabase usa ahora Argon2 para los hashes de contraseñas, lo que impide verificarlas 
-- directamente desde Postgres con pgcrypto de forma sencilla. Por tanto, esta función 
-- devuelve el email para que el cliente (frontend) pueda intentar iniciar sesión con él.

create or replace function public.get_email_for_login(p_username text)
returns text
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select u.email into v_email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = p_username;

  return v_email;
end;
$$ language plpgsql;
