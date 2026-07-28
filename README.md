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
