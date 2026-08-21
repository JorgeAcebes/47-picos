-- Añadir columna enable_regions a la tabla profiles, por defecto falso
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS enable_regions BOOLEAN DEFAULT false;
