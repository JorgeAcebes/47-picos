# Plan de Tarea: [Nombre de la Tarea]

> Fichero de memoria externa persistente para seguimiento de tareas largas.  
> Cada sesión nueva de un agente debe leer este fichero para retomar el trabajo sin perder contexto.

---

## 1. Información General

- **Identificador**: `task-YYYYMMDD-[slug]`
- **Responsable**: [Agente / Usuario]
- **Fecha de Inicio**: YYYY-MM-DD
- **Última Actualización**: YYYY-MM-DD
- **Estado General**: `[EN PROGRESO / COMPLETADO / BLOQUEADO]`

---

## 2. Contexto y Objetivos

### Objetivo Principal
[Describir en 1-2 párrafos la meta precisa a alcanzar].

### Criterios de Aceptación
- [ ] Criterio 1: ...
- [ ] Criterio 2: ...
- [ ] Criterio de verificación: `npm run verify` finaliza con código 0 sin excepciones.

---

## 3. Desglose de Fases y Pasos

| # | Paso | Estado | Verificación Asociada | Notas |
|---|---|:---:|---|---|
| 1.1 | [Descripción del paso 1] | `HECHO` | `npm test tests/...` | Completado en sesión X |
| 1.2 | [Descripción del paso 2] | `EN PROGRESO` | `npm run verify` | ... |
| 2.1 | [Descripción del paso 3] | `PENDIENTE` | ... | ... |

*(Estados válidos: `PENDIENTE`, `EN PROGRESO`, `HECHO`, `BLOQUEADO`)*

---

## 4. Registro de Decisiones y Hallazgos

- **[YYYY-MM-DD HH:MM]**: [Decisión de diseño tomada durante la sesión o anomalía detectada y cómo se resolvió].

---

## 5. Puntos de Recuperación (Commits)

- Paso 1 completado: commit `[hash]`
- Paso 2 completado: commit `[hash]`
