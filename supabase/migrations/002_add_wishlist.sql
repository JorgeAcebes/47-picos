-- Migración para añadir el soporte de "wishlist" (lista de deseos) a las ascensiones y países

-- Añadimos la columna is_wishlist a la tabla ascents
alter table public.ascents add column is_wishlist boolean not null default false;
