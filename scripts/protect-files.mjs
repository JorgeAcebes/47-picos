#!/usr/bin/env node
/**
 * Hook determinista de protección de ficheros y seguridad
 * Bloquea modificaciones a migraciones consolidadas (001 a 021) y previene fugas de .env
 */
import { execSync } from "child_process";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

console.log(`${colors.bright}▶ Comprobando reglas de protección de ficheros...${colors.reset}`);

try {
  const statusOutput = execSync("git status --porcelain", { encoding: "utf-8" });
  const lines = statusOutput.split("\n").filter(Boolean);

  for (const line of lines) {
    const filePath = line.slice(3).trim();

    // 1. Proteger ficheros de entorno
    if (filePath.startsWith(".env") && filePath !== ".env.example") {
      console.error(`\n${colors.red}✗ ERROR DE SEGURIDAD CRÍTICO:${colors.reset}`);
      console.error(`  El fichero '${filePath}' contiene secretos y no debe ser modificado o versionado.`);
      console.error(`  Asegúrate de que está ignorado en .gitignore.\n`);
      process.exit(1);
    }

    // 2. Proteger migraciones consolidadas (001 a 021)
    const migrationMatch = filePath.match(/supabase\/migrations\/(\d{3})_[^/]+\.sql/);
    if (migrationMatch) {
      const num = parseInt(migrationMatch[1], 10);
      const statusCode = line.slice(0, 2);

      // Si el fichero está modificado (M) o eliminado (D) y es <= 21
      if (num <= 21 && (statusCode.includes("M") || statusCode.includes("D"))) {
        console.error(`\n${colors.red}✗ ERROR DE INMUTABILIDAD DE BASE DE DATOS:${colors.reset}`);
        console.error(`  La migración '${filePath}' ya está consolidada en producción.`);
        console.error(`  Crea una nueva migración (022_<nombre>.sql) en lugar de modificar las anteriores.\n`);
        process.exit(1);
      }
    }
  }

  console.log(`${colors.green}✓ Todos los ficheros protegidos cumplen las reglas de seguridad.${colors.reset}\n`);
  process.exit(0);
} catch (err) {
  console.error("No se pudo comprobar el estado de git:", err.message);
  process.exit(0); // Continuar si no es un repo git activo
}
