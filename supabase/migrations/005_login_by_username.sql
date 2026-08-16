-- 005_login_by_username.sql

-- Enable pgcrypto just in case it's not enabled (it usually is by default)
create extension if not exists pgcrypto;

-- Create a secure function to lookup an email by username ONLY if the password is correct.
-- This prevents malicious actors from scraping emails using usernames.
create or replace function public.get_email_for_login(p_username text, p_password text)
returns text
security definer
set search_path = public
as $$
declare
  v_email text;
  v_encrypted_password text;
begin
  select u.email, u.encrypted_password into v_email, v_encrypted_password
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = p_username;

  if v_email is not null and v_encrypted_password is not null then
    -- auth.users.encrypted_password uses bcrypt, which works with pgcrypto's crypt()
    if v_encrypted_password = crypt(p_password, v_encrypted_password) then
      return v_email;
    end if;
  end if;

  return null;
end;
$$ language plpgsql;
