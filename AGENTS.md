# 47 Picos & 196 Países · Contexto Persistente para Agentes

> Aplicación web social y cartográfica para registrar el ascenso al techo provincial de las 50 provincias españolas más Ceuta y Melilla (52 demarcaciones, 47 cumbres físicas), el recorrido por 196 países del mundo y experiencias de aventura personalizadas.
> Construida con Next.js 15 (App Router), React 19, TypeScript, Leaflet y Supabase (Auth, Postgres RLS y Storage).

---

## 1. Comandos Canónicos de Desarrollo y Verificación

Todo agente debe utilizar estrictamente estos comandos:

| Acción | Comando | Notas |
| :--- | :--- | :--- |
| **Instalar dependencias** | `npm install` | Requiere Node >= 20 |
| **Servidor de desarrollo** | `npm run dev` | Puerto 3000 por defecto |
| **Compilación de producción** | `npm run build` | Valida rutas estáticas y bundles |
| **Linter de código** | `npm run lint` | ESLint 9 |
| **Suite de pruebas** | `npm test` | Vitest en modo headless |
| **Bucle rápido de desarrollo** | `npm run verify:fast` | **Inner Loop**: Ficheros + Tipos + Tests (~10s). Usar en cada iteración. |
| **Punto único de verificación** | `npm run verify` | **Outer Loop / Pre-Push**: Tipos + Lint + Tests + Build (~60s). Solo al solicitar push o entrega final. |
| **Evaluador de benchmarks** | `npm run harness:eval` | Valida contratos y tareas de agentes |

---

## 2. Definición de «Terminado» y Protocolo de Verificación (Two-Tier Loop)

### 2.1 Bucle Rápido vs Bucle Completo
- **Bucle Rápido de Iteración (`npm run verify:fast` o `npm test`)**: Comando obligatorio y predeterminado durante el trabajo iterativo, refactorización o corrección de bugs. Valida protección de archivos, tipos estáticos TypeScript y la suite completa de Vitest en ~10-12s, sin sobrecargar con `next build`.
- **Bucle Completo / Puerta Pre-Push (`npm run verify`)**: Ejecuta el oráculo íntegro con build de producción y auditoría ESLint. **Se ejecuta únicamente cuando el usuario solicite explícitamente hacer push, commit de finalización o cierre definitivo de la tarea.**

### 2.2 Criterio de Aceptación (Definition of Done)
Una tarea sólo se considera concluida cuando:
1. `npm run verify` finaliza con código de salida `0` sin excepciones al momento de la entrega o push.
2. No se modifican migraciones de Supabase ya consolidadas (`001` a `021`).
3. El estado en disco refleja los cambios sin ficheros temporales ni dependencias rotas.

---

## 3. Estructura de Directorios y Responsabilidades

```text
├── .agents/              # Configuración de agentes: rules/, skills/, workflows/, eval/
├── app/                  # Next.js 15 App Router (páginas, layouts, APIs /api/keepalive)
├── components/           # Componentes UI (mapas Leaflet, feeds, ranking, modal de fotos)
├── data/                 # Datasets estáticos: peaks.ts (52/47), countries.ts (196), experiences.ts, regions.ts
├── docs/                 # Memoria persistente: architecture.md, decisions/ (ADR), plans/
├── lib/                  # Clientes e utilidades: supabase.ts, image-utils.ts
├── public/               # Cartografía TopoJSON/GeoJSON y assets estáticos
├── scripts/              # Herramientas: verify.sh, verify.mjs, protect-files.mjs, compress-photos
├── supabase/migrations/  # Migraciones SQL contiguas (001 a 021+) con RLS obligatorio
└── tests/                # Oráculos de prueba automáticos y mocks en memoria (@/tests/mocks)
```

---

## 4. Invariantes Críticas del Proyecto (No Regresiones)

### 4.1 Estructura en Feed (`components/feed-tab.tsx`)
- **Enlace del título**: Siempre debe apuntar a `#panel=recordId` (`feed-record-title`). El título contiene únicamente el nombre del lugar o experiencia (`displayTitle = finalLocationName`), sin concatenar fechas.
- **Ubicación de la fecha**: La fecha de la actividad o rango de fechas va SIEMPRE en la cabecera debajo del nombre de usuario (`feed-card-header`), NUNCA en el título.
- **Compartir publicaciones**: Cada tarjeta del feed incluye obligatoriamente el botón de compartir (`feed-share-btn`) con deep-link a la actividad (`#panel=${recordId}`).
- **Sin botones de likes/dislikes/comentarios**: Las publicaciones del feed no muestran barra de reacciones ni botones de like/dislike/comentar.


### 4.2 Proporción de Picos (47 vs 52) y Experiencias (`components/summit-tracker.tsx`, `social-tab.tsx`)
- **47 Cimas Físicas**: Existen 52 demarcaciones provinciales pero **47 cumbres físicas únicas**. Las 5 compartidas son: Gorbea (Álava/Vizcaya), Torre Cerredo (León/Asturias), Peñalara (Madrid/Segovia), Peña Trevinca (Orense/Zamora) y Moncayo (Soria/Zaragoza).
- **Cálculo de Completados**: Siempre calcular picos completados mediante nombres únicos (`uniquePeakNames.size`), nunca por ID de demarcación.
- **Experiencias**: `cachedTotalCounts.experiences` nunca debe comenzar en `0`; inicializar con `predefinedCategories.reduce(...)`.
- **Sub-Items**: Una experiencia con sub-items sólo se computa completada si **todos** sus sub-items están marcados.

### 4.3 Ciclo de Vida de Autenticación (`components/auth-context.tsx`)
- **Sin Deslogueos Prematuros**: Jamás invocar `localStorage.removeItem("app_user_profile")` ni forzar `profile = null` en montaje inicial o estados transitorios de sesión nula.
- **Limpieza Estricta en SIGNED_OUT**: La sesión sólo se purga ante evento `SIGNED_OUT` explícito o invocación de `signOut()`.
- **Persistencia**: `AuthProvider` en `RootLayout` mantiene `globalSession` y `globalProfile` en memoria entre navegaciones.

### 4.4 Hidratación SSR y Mapas Leaflet
- Mapas (`spain-map.tsx`, `world-map.tsx`) dependen de `window`: cargar siempre mediante `dynamic(() => import(...), { ssr: false })`.
- Flags de perfil (`enable_experiences`, `enable_regions`) deben protegerse con estado `mounted` (`useEffect(() => setMounted(true), [])`) para evitar mismatch de hidratación.

### 4.5 Ranking e Inmutabilidad de Layout (`components/ranking.css`, `app/globals.css`)
- Columnas del ranking inmutables independientemente de la longitud de textos o filtros.
- Avatares del podio Top-3 requieren `margin: 4px;` en `.ranking-avatar` para evitar recorte del contorno.
- `html, body` deben conservar `scrollbar-gutter: stable;`.

### 4.6 Botón de Cuenta en Cabecera y Modalidades (`summit-tracker.tsx`, `ranking-tab.tsx`, `social-tab.tsx`, `profile-settings.tsx`)
- **Solo Foto o Inicial en Cabecera Superior**: Arriba a la derecha (`.account-button`), solo debe aparecer la foto de perfil o la letra inicial (o `?`), **en ningún caso** el nombre del correo electrónico ni el nombre de usuario.
- **Jerarquía de Modalidades**: Modo experiencias y Modo regiones dependen estrictamente del Modo países. Si se desactiva el Modo países, experiencias y regiones se congelan automáticamente (inactivas y deshabilitadas en interfaz y ajustes).
- **Ocultación sin Pérdida de Datos**: Desactivar una modalidad oculta los botones, publicaciones y vistas correspondientes, pero conserva íntegramente los datos y registros del usuario.
- **Ajustes de Perfil sin Scroll**: El modal de ajustes de perfil debe ser completamente visible sin necesidad de scroll vertical.

---

## 5. Reglas Críticas de Seguridad y Base de Datos

1. **Inmutabilidad de Migraciones**: Las migraciones históricas `001_` a `021_` **nunca se editan**. Cualquier cambio de esquema requiere crear `022_<nombre>.sql` (correlativo, idempotente y con `ENABLE ROW LEVEL SECURITY`).
2. **Secretos Protegidos**: Ficheros `.env*` nunca se commitean ni se exponen en cliente. Variables públicas llevan obligatoriamente prefijo `NEXT_PUBLIC_`.
3. **Mocks en Pruebas**: Nunca conectar a la base de datos real en tests unitarios; usar `@/tests/mocks/supabase-mock`.

---

## 6. Documentación Adicional Bajo Demanda

Para detalles arquitectónicos profundos, consultar según necesidad:
- Arquitectura completa del sistema: [`docs/architecture.md`](file:///c:/Users/jorge/Desktop/52_picos/docs/architecture.md)
- Registro de Decisiones de Arquitectura (ADR): [`docs/decisions/`](file:///c:/Users/jorge/Desktop/52_picos/docs/decisions/)
- Plantilla y seguimiento de tareas largas: [`docs/plans/template.md`](file:///c:/Users/jorge/Desktop/52_picos/docs/plans/template.md)
- Capacidades empaquetadas (Skills): [`.agents/skills/`](file:///c:/Users/jorge/Desktop/52_picos/.agents/skills/)
