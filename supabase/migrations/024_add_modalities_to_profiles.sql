-- 024_add_modalities_to_profiles.sql
-- Añadir columnas enable_peaks y enable_countries a la tabla profiles, por defecto true
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS enable_peaks BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS enable_countries BOOLEAN DEFAULT true;
