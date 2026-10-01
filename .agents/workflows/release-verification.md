# Workflow: Verificación Completa y Auditoría de Calidad

> Procedimiento repetible para validar el repositorio antes de dar por concluida una sesión de trabajo o realizar un despliegue.

---

## Pasos de Ejecución

1. **Ejecutar el Oráculo Principal de Verificación**:
   ```bash
   npm run verify
   ```
   Comprueba:
   - Protección de ficheros (`scripts/protect-files.mjs`)
   - Tipos estáticos (`npx tsc --noEmit`)
   - Linter (`npx eslint .`)
   - Tests de regresión e invariantes (`npx vitest run`)
   - Build de producción (`npx next build`)

2. **Ejecutar el Evaluador de Benchmarks de Agentes**:
   ```bash
   npm run harness:eval
   ```
   Valida que los 6 contratos clave mantengan una puntuación de 100/100.

3. **Revisar el Estado Git**:
   Asegurar que no queden ficheros temporales ni secretos expuestos:
   ```bash
   git status
   ```

4. **Registrar Estado en el Plan**:
   Si se trata de una tarea larga, actualizar `docs/plans/<tarea>.md` marcando los pasos completados y registrando las decisiones adoptadas.
