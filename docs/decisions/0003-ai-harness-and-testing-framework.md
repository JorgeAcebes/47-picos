# ADR 0003: Arquitectura del Harness de IA y Marco de Verificación

- **Estado**: Aceptado
- **Fecha**: 2026-10-01

## Contexto
El desarrollo del proyecto involucra tanto programadores humanos como agentes de inteligencia artificial autónomos (Claude Code, Antigravity, Cursor, etc.). Sin un arnés determinista, las modificaciones introducidas por modelos probabilísticos sufren de alucinaciones, roturas de invariantes críticas (p. ej., proporciones 47 vs 52 picos, hidratación SSR con Leaflet, fechas en feed) y modificación de migraciones SQL históricas.

## Decisión
Se implementa una arquitectura de arnés de IA completa basada en los principios fundamentales:
1. **Punto único canónico de verificación**: `npm run verify` (`scripts/verify.sh` y `scripts/verify.mjs`) que ejecuta en serie:
   - Protección determinista de ficheros (`scripts/protect-files.mjs`).
   - Tipado estático con TypeScript (`tsc --noEmit`).
   - Auditoría de linter (`eslint .`).
   - Suite de pruebas automatizadas con Vitest (`tests/`).
   - Compilación de producción con Next.js (`next build`).
2. **Oráculo de Pruebas**: Suite de pruebas con Vitest y mocks de Supabase en memoria (`harness/mocks/supabase-mock.ts`).
3. **Contexto Persistente Conciso**: `AGENTS.md` como fuente de verdad (<200 líneas) con punteros delgados (`CLAUDE.md`) para interoperabilidad.
4. **CI como Segunda Barrera**: GitHub Actions (`.github/workflows/ci.yml`) que replica exactamente `npm run verify`.
5. **Memoria Externa en Disco**: Planes para tareas largas en `docs/plans/` y registro de decisiones en `docs/decisions/`.

## Consecuencias
- **Positivas**: Los errores de los agentes se detectan de forma barata y automática antes de consolidar código; las tareas complejas de múltiples sesiones pueden reanudarse sin degradación de contexto.
- **Negativas**: Mayor rigor temporal en el ciclo de verificación (el build de Next.js toma ~30-60 segundos por ciclo completo).
