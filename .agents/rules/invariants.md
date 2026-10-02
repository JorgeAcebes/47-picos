---
trigger: model_decision
description: Invariantes críticas de componentes, feeds, fechas, proporciones de picos, sub-items, autenticación y ranking
---

# Invariantes Críticas de Arquitectura y Código (Anti-Regresiones)

Este documento reúne todas las reglas no negociables de la aplicación. Cualquier modificación a componentes de interfaz, navegación, contadores, autenticación o ranking **DEBE** respetar estrictamente estos patrones:

---

## 1. Fechas y Estructura en Feed (`components/feed-tab.tsx`)

1. **Ubicación de la Fecha**: La fecha de la actividad (o rango de fechas) **NUNCA** se renderiza en el título de la tarjeta (`displayTitle`), **SIEMPRE** en el subtítulo bajo el usuario (`feed-card-header`).
2. **Título Limpio**: El título (`feed-record-title`) contiene exclusivamente el nombre de la cumbre, país o experiencia (`finalLocationName`), sin añadidos ni concatenaciones de fechas.
3. **Formato de Fecha en Subtítulo**:
   - Fecha única: `${startStr}` (ej. `12 ago 2024`) o fallback de tiempo relativo (`formatDateSafe`).
   - Rango: `${startStr} - ${endStr}` (ej. `12 ago 2024 - 15 ago 2024`).
4. **Deep-linking en Título**: El título `<h3 className="feed-record-title">` enlaza con `#panel=${recordId}`:
   - Picos: `?challenge=peaks#panel=peakId`
   - Países: `?challenge=countries#panel=countryId`
   - Experiencias: `?challenge=experiences#panel=experienceId` (o `${expId}::${subItemId}`)
5. **Botón Compartir en Publicaciones (`feed-share-btn`)**: Cada tarjeta del feed debe incluir un botón de compartir (`feed-share-btn`) con deep-link a `#panel=${recordId}`, soportando Web Share API (`navigator.share`) y fallback al portapapeles con feedback "¡Copiado!".
6. **Sin Botones de Reacciones**: Las tarjetas del feed no incluyen botones ni contadores de like, dislike o comentarios.

---

## 2. Conteos y Proporciones (Picos y Experiencias)

1. **Regla de los 47 Picos (`components/social-tab.tsx`, `components/summit-tracker.tsx`)**:
   - España tiene 52 demarcaciones provinciales (`peaks.ts`), pero exactamente **47 cumbres físicas únicas**.
   - El total de picos posibles **SIEMPRE** es `47` (no 52).
   - El progreso completado se calcula por **nombres de cumbre únicos**, jamás por identificador de provincia:
     ```ts
     const uniquePeakNames = new Set(
       ascData.map(a => peaks.find(p => p.id === a.summit_id)?.name).filter(Boolean)
     );
     const pCount = uniquePeakNames.size; // Siempre sobre 47
     ```
2. **Total de Experiencias Predefinidas**:
   - `cachedTotalCounts.experiences` **NUNCA** debe inicializarse en `0`; inicializar siempre con:
     ```ts
     predefinedCategories.reduce((acc, cat) => acc + cat.experiences.length, 0)
     ```
3. **Completitud de Experiencias con Sub-items**:
   - Una experiencia **sin sub-items** se completa con 1 registro.
   - Una experiencia **con sub-items** (ej. Big Five, 7 Maravillas) **SÓLO** se computa completada cuando **TODOS** sus sub-items están registrados:
     ```ts
     subItemIds.every((id: string) => completedSubItems.has(id))
     ```
4. **Sincronización Custom/Ocultos**: Tanto `social-tab.tsx` como `summit-tracker.tsx` deben sincronizar con `custom_experiences`, `custom_experience_categories` y `hidden_items` para mostrar totales idénticos.

---

## 3. Autenticación y Ciclo de Vida de Sesión (`components/auth-context.tsx`)

1. **Sin Deslogueos Prematuros**:
   - `localStorage.removeItem("app_user_profile")` y `profile = null` **SÓLO** se invocan ante evento explícito `event === "SIGNED_OUT"` o llamada a `signOut()`.
   - Montaje inicial o estados transitorios de sesión nula **NUNCA** deben purgar el perfil en disco o memoria.
2. **Caché en Memoria (`RootLayout`)**:
   - `globalSession` y `globalProfile` persisten a nivel de módulo entre navegaciones de ruta en cliente.
   - Evitar re-fetch del perfil si `globalProfile.id === nextSession.user.id`.

---

## 4. Mapas Leaflet e Hidratación SSR

1. **Sin SSR en Mapas**: Mapas (`spain-map.tsx`, `world-map.tsx`, `collective-map.tsx`) dependen de `window`: cargar siempre con:
   ```tsx
   dynamic(() => import("@/components/..."), { ssr: false })
   ```
2. **Protección de Hidratación en UI (`components/summit-tracker.tsx`)**:
   - Proteger los selectores condicionales dependientes de perfil (`enable_experiences`, `enable_regions`) con estado `mounted`:
     ```tsx
     const [mounted, setMounted] = useState(false);
     useEffect(() => setMounted(true), []);
     {!isPeaks && (experiencesMode || (mounted && myProfile?.enable_experiences)) && ( ... )}
     ```

---

## 5. Ranking y Estabilidad de Scroll (`components/ranking.css`, `app/globals.css`)

1. **Contenedor Inmutable**: Anchos de columnas fijos independientemente de filtros o longitud de textos.
2. **Anillos del Podio Top-3**: Los avatares con contorno (`outline: 2px solid ...; outline-offset: 2px;`) deben conservar `margin: 4px;` en `.ranking-avatar` para no ser recortados.
3. **Gutter Estable**: `html, body` deben conservar `scrollbar-gutter: stable;` para evitar desplazamientos horizontales al cambiar de pestaña.

---

## 6. Modo de Experiencias y Cartografía (`components/world-map.tsx`, `components/summit-tracker.tsx`)

1. **Visibilidad Estricta de Marcadores en Mapa**: Los marcadores de experiencias en el mapa mundial (`WorldMap`) NUNCA deben renderizarse si `experiencesMode` es falso (`if (experiencesMode && experienceRecords)`). Ocultar únicamente mediante CSS es insuficiente porque los hitboxes de Leaflet interceptan clics.
2. **Cierre de Registro al Desactivar Modo Experiencias**: Al pulsar el botón de alternar experiencias para desactivarlo, si el usuario tiene abierto un registro o panel de experiencia, dicho registro debe cerrarse (`closePanel()`) y purgar el hash `#panel=` de la URL. Si el elemento abierto no es una experiencia (país o región), debe permanecer abierto.

---

## 7. Enlaces en Registros y Feed (`components/summit-tracker.tsx`, `components/feed-tab.tsx`)

1. **Visibilidad de Enlaces en Tarjetas de Registro**: Cuando un ascenso, visita a país o experiencia cuenta con hipervínculo (`link`), debe renderizarse con su botón/insignia interactiva (`renderRecordLink`) tanto en el feed social como en las tarjetas de registro del panel lateral (`.completed-card`).
2. **Protocolo Seguro**: Todo hipervínculo debe normalizarse garantizando prefijo `http://` o `https://` para evitar rutas relativas involuntarias al navegar externamente.

---

## 8. Aislamiento y Sigilo de Perfiles de Testeo (`is_test: true`)

1. **Invisibilidad en Ranking**: Todo perfil marcado con `is_test: true` queda **ESTRICTAMENTE EXCLUIDO** de la función `get_user_ranking` (modalidades picos y países) y del conteo de usuarios registrados.
2. **Invisibilidad en Feed Social**: Las actividades (ascensos y experiencias) de usuarios de testeo no deben aparecer en `feed-tab.tsx`.
3. **Invisibilidad en Búsqueda y Recomendaciones**: En `social-tab.tsx`, las búsquedas por usuario (`@test...`) y la función `get_recommended_profiles` deben filtrar forzosamente `.neq('is_test', true)`.
4. **Protección RLS y Vista de Perfil**: Políticas de seguridad a nivel de fila (RLS en Supabase) y `ProfileView` impiden el acceso a perfiles de prueba por parte de otros usuarios.
5. **Bucle de Ejecución de Tests Profundos**: La suite profunda E2E (`tests/deep/full-user-lifecycle.test.ts`) se ejecuta exclusivamente en el pipeline pre-push (`npm run verify` o `npm run test:deep`), manteniéndose excluida del bucle rápido de desarrollo (`npm run verify:fast`).

---

## 9. Botón de Cuenta en Cabecera (`.account-button`) y Modalidades

1. **Solo Foto o Inicial en Cabecera Superior**: Arriba a la derecha (`.account-button`) en `summit-tracker.tsx`, `ranking-tab.tsx` y `social-tab.tsx`, solo debe aparecer el avatar circular (foto de perfil o inicial `?` / letra inicial). En **NINGÚN** caso debe mostrarse texto con el correo electrónico ni el nombre de usuario al lado del avatar.
2. **Jerarquía de Modalidades**: "Modo experiencias" y "Modo regiones" dependen jerárquicamente del "Modo países". Si "Modo países" está desactivado (`enable_countries: false` o `canShowCountries: false`), el "Modo experiencias" y el "Modo regiones" quedan congelados y no operativos en la interfaz ni en las opciones de perfil.
3. **Persistencia sin Pérdida de Datos**: Desactivar una modalidad oculta las vistas, botones, publicaciones y registros correspondientes en UI y Feed, pero jamás destruye los datos históricos de ascensos, visitas o experiencias del usuario.
4. **Dimensiones del Panel de Ajustes**: El modal de ajustes de perfil (`ProfileSettings`) debe permanecer visible sin requerir scroll vertical en la vista principal.