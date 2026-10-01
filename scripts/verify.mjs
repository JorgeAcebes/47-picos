#!/usr/bin/env node
/**
 * Punto único de verificación multiplataforma (Windows / macOS / Linux)
 * Modos de ejecución:
 *  - npm run verify:fast  -> Bucle rápido de desarrollo (Protección + Tipos + Tests, ~4s)
 *  - npm run verify       -> Bucle completo pre-push / CI (Protección + Tipos + Lint + Tests + Build, ~60s)
 */
import { spawnSync } from "child_process";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
};

const isFastMode = process.argv.includes("--fast");

const allSteps = [
  { name: "Protección de ficheros y migraciones", command: "node", args: ["scripts/protect-files.mjs"] },
  { name: "Tipado estático (tsc)", command: "npx", args: ["tsc", "--noEmit"] },
  { name: "Linter (ESLint)", command: "npx", args: ["eslint", "."], skipInFast: true },
  { name: "Tests automatizados (Vitest)", command: "npx", args: ["vitest", "run"] },
  { name: "Compilación de producción (Next.js build)", command: "npx", args: ["next", "build"], skipInFast: true },
];

const steps = isFastMode ? allSteps.filter((s) => !s.skipInFast) : allSteps;

console.log(`\n${colors.bright}====================================================${colors.reset}`);
console.log(`${colors.bright}  VERIFICACIÓN DEL PROYECTO (${isFastMode ? "MODO RÁPIDO - DESARROLLO" : "MODO COMPLETO - PRE-PUSH / CI"})${colors.reset}`);
console.log(`${colors.bright}====================================================${colors.reset}\n`);

const startTime = Date.now();

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const stepNum = `[${i + 1}/${steps.length}]`;
  process.stdout.write(`▶ ${colors.cyan}${stepNum} ${step.name}${colors.reset}... `);

  const stepStart = Date.now();
  const res = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: true,
  });

  const durationMs = Date.now() - stepStart;

  if (res.status !== 0) {
    console.log(`\n${colors.red}✗ ERROR EN ETAPA: ${step.name}${colors.reset} (código ${res.status}) ${colors.dim}(${durationMs}ms)${colors.reset}\n`);
    console.error(`La verificación falló. Por favor corrige los errores anteriores antes de continuar.`);
    process.exit(res.status || 1);
  }

  console.log(`${colors.green}✓ OK${colors.reset} ${colors.dim}(${durationMs}ms)${colors.reset}`);
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`\n${colors.green}${colors.bright}====================================================${colors.reset}`);
console.log(`${colors.green}${colors.bright}  ✓ TODAS LAS COMPROBACIONES HAN PASADO (${totalDuration}s)       ${colors.reset}`);
console.log(`${colors.green}${colors.bright}====================================================${colors.reset}\n`);
process.exit(0);
