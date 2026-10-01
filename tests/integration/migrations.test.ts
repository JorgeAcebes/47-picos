import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Supabase Migrations Sequence and Schema Integrity", () => {
  const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  it("should have migration files in the migrations directory", () => {
    expect(migrationFiles.length).toBeGreaterThanOrEqual(21);
  });

  it("should follow the standard naming convention 'XXX_name.sql' with contiguous numbering", () => {
    const sequenceNumbers: number[] = [];

    for (const file of migrationFiles) {
      const match = file.match(/^(\d{3})_([a-z0-9_]+)\.sql$/);
      expect(match, `File ${file} does not follow naming format '001_name.sql'`).not.toBeNull();
      if (match) {
        sequenceNumbers.push(parseInt(match[1], 10));
      }
    }

    // Check contiguous sequence starting from 1
    for (let i = 0; i < sequenceNumbers.length; i++) {
      expect(sequenceNumbers[i]).toBe(i + 1);
    }
  });

  it("should verify every migration file is non-empty", () => {
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, "utf-8").trim();
      expect(content.length, `Migration ${file} is empty`).toBeGreaterThan(10);
    }
  });

  it("should ensure RLS is considered on all created public tables", () => {
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // Match 'create table [if not exists] public.tableName'
      const createTableRegex = /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.([a-zA-Z0-9_]+)/gi;
      let match;
      while ((match = createTableRegex.exec(content)) !== null) {
        const tableName = match[1];
        // Either enable RLS or create a policy
        const rlsRegex = new RegExp(
          `(alter\\s+table\\s+public\\.${tableName}\\s+enable\\s+row\\s+level\\s+security|create\\s+policy.*on\\s+public\\.${tableName})`,
          "i"
        );
        const hasRLS = rlsRegex.test(content);
        expect(
          hasRLS,
          `Table public.${tableName} created in ${file} should have RLS enabled or policies defined`
        ).toBe(true);
      }
    }
  });
});
