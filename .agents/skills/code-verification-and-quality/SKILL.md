---
name: code-verification-and-quality
description: >-
  Use this skill whenever making code changes, refactoring, fixing bugs, or before committing code in the 47 Picos project.
  Guides the agent through running static type checks, ESLint quality audits, Vitest unit/integration tests, and the project verification harness.
---

# Code Verification and Quality Gate

This skill outlines the quality standards, execution commands, and troubleshooting runbooks for verifying changes in the **47 Picos y 196 Países** application.

---

## 1. Quick Verification Commands

Select the verification tier based on your current task state:

```bash
# 1. Inner Loop (Iterative development): Protect + Typecheck + Vitest (~10s)
npm run verify:fast

# 2. Fast unit & integration tests only (~3s)
npm test

# 3. Outer Loop / Pre-Push (Definition of Done): Protect + Typecheck + Lint + Tests + Build (~60s)
npm run verify

# 4. Agent benchmark evaluation harness
npm run harness:eval
```

---

## 2. Verification Pipeline Stages

### Stage 1: TypeScript Static Typecheck
- **Command**: `npx tsc --noEmit`
- **Criteria**: 0 errors.
- **Common Caveats**:
  - `Leaflet` / `react-leaflet`: Types must be imported from `@types/leaflet`. Remember Leaflet relies on browser APIs (`window`, `L`); map components must use `'use client'` and dynamic imports with `{ ssr: false }`.
  - Next.js 15 route parameters: Page props in Next.js 15 app router use `Promise<{ [key]: string }>` for `params` in async server components, or direct objects in client components.
  - Supabase client nullability: `supabase` in `lib/supabase.ts` is typed as `SupabaseClient | null`. Always guard with `if (!supabase) return;` or check `isSupabaseConfigured`.

### Stage 2: ESLint Code Quality Gate
- **Command**: `npm run lint` (`eslint .`)
- **Criteria**: 0 errors. (Warnings should be reviewed and minimized).
- **Guidelines**:
  - Unused variables should be removed or prefixed with `_`.
  - Exhaustive dependencies in React hooks (`useEffect`, `useCallback`, `useMemo`): Include all required references or stabilize functions using `useCallback`.
  - `<img>` vs `<Image />`: In canvas/crop modals or external image blobs (e.g. `react-image-crop`, object URLs), `<img>` may trigger warnings; ignore or use custom loaders where appropriate.

### Stage 3: Vitest Automated Test Suite
- **Command**: `npm test` (`vitest run`)
- **Criteria**: 100% tests passing across all test suites:
  - `tests/unit/peaks.test.ts`: Peaks and shared summits integrity.
  - `tests/unit/countries.test.ts`: 196 world countries, ISO codes, and continents.
  - `tests/unit/experiences.test.ts`: Predefined categories and unique experience IDs.
  - `tests/unit/regions.test.ts`: Sub-national regions formatting.
  - `tests/unit/image-utils.test.ts`: Image compression fallbacks and parameters.
  - `tests/integration/migrations.test.ts`: Migration sequence and RLS policies.
  - `tests/integration/supabase-mock.test.ts`: Supabase mock query contracts.

### Stage 4: Agent Benchmark Evaluation
- **Command**: `npm run harness:eval`
- **Output**: Generates a summary report in `harness/eval/reports/benchmark-report.md`.
- **Options**:
  - `npm run harness:eval -- --list` : List all evaluation benchmarks.
  - `npm run harness:eval -- --task=eval-01-peaks-integrity` : Run a single benchmark task.
  - `npm run harness:eval -- --category=database` : Run database benchmark tasks.

---

## 3. Troubleshooting Common Errors

### Leaflet `window is not defined`
Map components (`spain-map.tsx`, `world-map.tsx`, `collective-map.tsx`) fail if rendered on the server.
**Resolution**:
```tsx
import dynamic from "next/dynamic";

const SpainMap = dynamic(() => import("@/components/spain-map"), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center">Cargando mapa...</div>,
});
```

### Supabase Queries in Tests
Do not import the live Supabase client in unit tests.
**Resolution**:
Import `createMockSupabaseClient` from `@/tests/mocks/supabase-mock`:
```ts
import { createMockSupabaseClient } from "@/tests/mocks/supabase-mock";

const mockSupabase = createMockSupabaseClient();
mockSupabase.seedTable("ascents", [ ... ]);
```

---

## 4. Verification Checklist Before Committing

- [ ] `npm run verify` completed with `✓ TODAS LAS COMPROBACIONES HAN PASADO`.
- [ ] No regressions introduced in existing components or data files.
- [ ] Git status clean or only containing intentional modifications.
