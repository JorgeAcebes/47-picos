# Workflow: Creación de Nueva Migración de Base de Datos

> Procedimiento repetible para introducir cambios de esquema en Supabase sin regresiones.

---

## Pasos de Ejecución

1. **Determinar el siguiente número de secuencia**:
   Inspeccionar `supabase/migrations/` y tomar el número mayor + 1 (ejemplo: `022`).

2. **Crear el archivo SQL con patrón canónico**:
   - Nombre: `supabase/migrations/022_<descripcion_corta>.sql`
   - Aplicar idempotencia:
     ```sql
     CREATE TABLE IF NOT EXISTS public.<tabla> (...);
     ALTER TABLE public.<tabla> ENABLE ROW LEVEL SECURITY;
     DROP POLICY IF EXISTS "<politica>" ON public.<tabla>;
     CREATE POLICY "<politica>" ON public.<tabla> ...;
     ```

3. **Validar la secuencia e integridad de la migración**:
   ```bash
   npx vitest run tests/integration/migrations.test.ts
   ```

4. **Validar la protección de ficheros y el pipeline completo**:
   ```bash
   npm run verify
   ```
