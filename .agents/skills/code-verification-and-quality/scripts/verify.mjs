#!/usr/bin/env node
/**
 * Standalone verification runner helper
 */
import { spawnSync } from "child_process";

console.log("Running Code Verification Pipeline...");

const result = spawnSync("npm", ["run", "verify"], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
