# 47 Picos

Aplicación web personal y multiusuario para registrar el techo de las 50 provincias españolas, Ceuta y Melilla. Incluye mapa interactivo, marcadores, sombreado de provincias completadas, autenticación por correo y galería de fotos por ascensión.

--- 

La combinación elegida es **Supabase + Vercel**: Supabase guarda cuentas, progreso y fotos; Vercel publica la aplicación en una URL pública. Ambos tienen plan gratuito para este proyecto.

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard) y, en **SQL Editor**, ejecuta [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql).
2. En **Authentication → URL Configuration**, configura la URL de tu futura web como `Site URL`. En proveedores de correo, deja activo Email; Supabase enviará el correo de confirmación automáticamente.
3. En **Project Settings → API**, copia `Project URL` y la clave `anon` (nunca la clave `service_role`) en las variables mostradas en [`.env.example`](./.env.example).
4. Sube este repositorio a GitHub y en [Vercel](https://vercel.com/new) importa el repositorio. Añade las mismas dos variables de entorno, pulsa **Deploy** y copia la URL generada en la configuración de Supabase del paso 2.

Para trabajar en local:

```bash
pnpm install
pnpm dev
```

El mapa utiliza límites provinciales abiertos y teselas de OpenStreetMap. El catálogo incluye 52 demarcaciones; hay cinco cumbres compartidas, por lo que el reto reúne 47 cimas físicas distintas.
