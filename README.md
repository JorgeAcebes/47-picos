# 47 Picos y 196 Países

Aplicación web personal y multiusuario para registrar el techo de las 50 provincias españolas, Ceuta y Melilla, así como llevar un registro de los países del mundo visitados. Incluye mapa interactivo, marcadores, sombreado de territorios completados, autenticación por correo y galería de fotos.

--- 

La combinación elegida es **Supabase + Vercel**: Supabase guarda cuentas, progreso y fotos; Vercel publica la aplicación en una URL pública. Ambos tienen plan gratuito para este proyecto. Además, se incluye un Cron Job en Vercel (`/api/keepalive`) para evitar que el plan gratuito de Supabase se pause por inactividad.

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard) y, en **SQL Editor**, ejecuta [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql).
2. En **Authentication → URL Configuration**, configura la URL de tu futura web como `Site URL`. En proveedores de correo, deja activo Email; Supabase enviará el correo de confirmación automáticamente.
3. En **Project Settings → API**, copia `Project URL`, la clave `anon` y la clave secreta `service_role` (esta última para usar en el backend). 
4. Sube este repositorio a GitHub y en [Vercel](https://vercel.com/new) importa el repositorio. Añade las siguientes variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto de Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave pública (anon) de Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de Supabase (usada por el Cron para mantener activa la base de datos).
   - `CRON_SECRET`: Genera una contraseña segura aleatoria (Vercel la usará automáticamente para autorizar el Cron de keepalive).
5. Pulsa **Deploy** y copia la URL generada en la configuración de Supabase del paso 2.

Para trabajar en local:

```bash
pnpm install
pnpm dev
```

El mapa utiliza límites abiertos y teselas de OpenStreetMap. El reto de España incluye 52 demarcaciones (47 cimas físicas distintas al haber compartidas), y el reto mundial incluye los países registrados.

---

## Arnés de Pruebas y Verificación (Harness)

El proyecto cuenta con un arnés dual de verificación técnica y evaluación para agentes:

```bash
# Ejecutar tests unitarios y de integración (Vitest)
npm test

# Ejecutar el punto único canónico de verificación (Protect + Types + Lint + Tests + Build)
npm run verify

# Ejecutar el evaluador de benchmarks de agentes
npm run harness:eval

# Listar tareas de benchmark disponibles
npm run harness:eval -- --list
```

- **Mocks**: Cliente en memoria de Supabase en [`tests/mocks/supabase-mock.ts`](./tests/mocks/supabase-mock.ts) para testing sin conexión.
- **Reportes**: Los benchmarks generan un informe Markdown en [`.agents/eval/reports/benchmark-report.md`](./.agents/eval/reports/benchmark-report.md).

---

## Skills para Agentes (`.agents/skills/`)

Para asistentes de IA y agentes en Antigravity, se han configurado 4 skills especializadas:

1. [**`code-verification-and-quality`**](./.agents/skills/code-verification-and-quality/SKILL.md): Puerta de calidad, reglas de TypeScript, ESLint, Vitest y resolución de errores típicos (React 19, Leaflet SSR).
2. [**`supabase-and-migrations`**](./.agents/skills/supabase-and-migrations/SKILL.md): Guía de migraciones SQL contiguas (001 a 021+), políticas RLS y funciones PL/pgSQL.
3. [**`geodata-and-maps`**](./.agents/skills/geodata-and-maps/SKILL.md): Gestión de los 52 techos provinciales (47 físicos), 196 países, regiones y mapas interactivos con Leaflet.
4. [**`media-and-experiences`**](./.agents/skills/media-and-experiences/SKILL.md): Optimización de imágenes (Sharp/canvas), subidas a storage y sistema de experiencias personalizadas.

