---
trigger: always_on
description: Reglas de seguridad estrictas, protección de secretos y congelación de migraciones
---

# Reglas Críticas de Seguridad y Datos

1. **Inmutabilidad de Migraciones**:
   - Las migraciones `001_` a `021_` en `supabase/migrations/` están congeladas y no deben ser modificadas ni eliminadas.
   - Cualquier alteración de esquema debe realizarse en un fichero nuevo correlativo (`022_<descripcion>.sql`).

2. **Protección de Variables de Entorno y Secretos**:
   - Los ficheros `.env*` nunca deben commitearse ni exponer claves privadas en el código cliente.
   - Variables públicas accesibles en navegador deben llevar obligatoriamente el prefijo `NEXT_PUBLIC_`.

3. **Row Level Security (RLS)**:
   - Toda tabla pública creada en Supabase debe ejecutar obligatoriamente `ALTER TABLE public.<nombre> ENABLE ROW LEVEL SECURITY;`.
   - Se deben definir políticas explícitas para SELECT, INSERT, UPDATE y DELETE.
