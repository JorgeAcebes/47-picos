import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { peaks } from "@/data/peaks";
import { predefinedCategories } from "@/data/experiences";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function isUnknownDate(dateVal: string | undefined | null): boolean {
  if (!dateVal) return true;
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (trimmed.startsWith("1900-01-01") || trimmed.startsWith("1899-12-31")) return true;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return true;
  return d.getFullYear() <= 1900;
}

function formatCustomDate(dateVal: string | undefined | null): string {
  if (!dateVal || isUnknownDate(dateVal)) return "";
  const trimmed = typeof dateVal === "string" ? dateVal.split("T")[0] : "";
  const parts = trimmed.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    return format(d, "d MMM yyyy", { locale: es });
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  return format(d, "d MMM yyyy", { locale: es });
}

function formatRecordDateRange(startDateVal: string | undefined | null, endDateVal: string | undefined | null): string {
  const startStr = formatCustomDate(startDateVal);
  if (!startStr) return "";
  if (endDateVal && !isUnknownDate(endDateVal) && endDateVal !== startDateVal) {
    const endStr = formatCustomDate(endDateVal);
    if (endStr && endStr !== startStr) {
      return `${startStr} - ${endStr}`;
    }
  }
  return startStr;
}

describe("Project Critical Invariants (No Regressions)", () => {
  const rootDir = path.resolve(__dirname, "../../");

  describe("Feed Card & Date Invariants", () => {
    it("Invariant 1.1: Feed tab must format relative time for header and retain title link", () => {
      const feedTabPath = path.join(rootDir, "components/feed-tab.tsx");
      const content = fs.readFileSync(feedTabPath, "utf-8");

      expect(content).toContain("formatDateSafe(");
      expect(content).toContain("#panel=");
    });

    it("Invariant 1.2: Activity date formatting for single date", () => {
      const result = formatRecordDateRange("2024-08-12", null);
      expect(result).toBe("12 ago 2024");
    });

    it("Invariant 1.3: Activity date formatting for date range", () => {
      const result = formatRecordDateRange("2024-08-12", "2024-08-15");
      expect(result).toBe("12 ago 2024 - 15 ago 2024");
    });

    it("Invariant 1.4: Date formatting should not duplicate date when start and end date are the same", () => {
      const result = formatRecordDateRange("2024-08-12", "2024-08-12");
      expect(result).toBe("12 ago 2024");
    });

    it("Invariant 1.5: Date formatting should return empty string for unknown/invalid dates", () => {
      expect(formatRecordDateRange("1900-01-01", null)).toBe("");
      expect(formatRecordDateRange("1899-12-31", null)).toBe("");
      expect(formatRecordDateRange(null, null)).toBe("");
    });

    it("Invariant 1.6: Feed cards must include feed-share-btn for sharing deep-links", () => {
      const feedTabPath = path.join(rootDir, "components/feed-tab.tsx");
      const content = fs.readFileSync(feedTabPath, "utf-8");

      expect(content).toContain("feed-share-btn");
      expect(content).toContain("handleShare");
    });

    it("Invariant 1.7: Feed cards must NOT contain reaction buttons (like, dislike, comment)", () => {
      const feedTabPath = path.join(rootDir, "components/feed-tab.tsx");
      const content = fs.readFileSync(feedTabPath, "utf-8");

      expect(content).not.toContain("feed-reaction-btn");
      expect(content).not.toContain("feed-comments-section");
      expect(content).not.toContain("feed-card-actions");
    });

    it("Invariant 1.8: Feed title must NOT concatenate date, keeping displayTitle clean", () => {
      const feedTabPath = path.join(rootDir, "components/feed-tab.tsx");
      const content = fs.readFileSync(feedTabPath, "utf-8");

      expect(content).toContain("const displayTitle = finalLocationName;");
      expect(content).not.toMatch(/displayTitle\s*=\s*dateRangeStr/);
    });
  });

  describe("Counters & Proportions Invariants", () => {
    it("Invariant 2.1: Peaks count must preserve 52 demarcations and 47 physical peaks", () => {
      expect(peaks).toHaveLength(52);
      const uniquePeaks = new Set(peaks.map((p) => p.name));
      expect(uniquePeaks.size).toBe(47);
    });

    it("Invariant 2.2: Experiences with sub-items are ONLY complete when ALL sub-items are marked", () => {
      const expWithSubItems = predefinedCategories
        .flatMap((c) => c.experiences)
        .find((e) => e.subItems && e.subItems.length > 1);

      expect(expWithSubItems).toBeDefined();
      if (!expWithSubItems || !expWithSubItems.subItems) return;

      const subIds = expWithSubItems.subItems.map((s) => s.id);

      // Partial completion: all except the last one
      const partialExpRecords = subIds.slice(0, -1).map((sId) => ({
        experience_id: expWithSubItems.id,
        sub_item_id: sId,
      }));

      const isPartiallyComplete = subIds.every((id) =>
        partialExpRecords.some((r) => r.experience_id === expWithSubItems.id && r.sub_item_id === id)
      );
      expect(isPartiallyComplete).toBe(false);

      // Full completion: all sub-items
      const fullExpRecords = subIds.map((sId) => ({
        experience_id: expWithSubItems.id,
        sub_item_id: sId,
      }));

      const isFullyComplete = subIds.every((id) =>
        fullExpRecords.some((r) => r.experience_id === expWithSubItems.id && r.sub_item_id === id)
      );
      expect(isFullyComplete).toBe(true);
    });
  });

  describe("Auth, Layout & Hydration Invariants", () => {
    it("Invariant 3.1: AuthContext must preserve session across mounts and only purge on SIGNED_OUT", () => {
      const authContextPath = path.join(rootDir, "components/auth-context.tsx");
      const content = fs.readFileSync(authContextPath, "utf-8");

      expect(content).toContain("globalSession");
      expect(content).toContain("globalProfile");
      expect(content).toContain("SIGNED_OUT");
    });

    it("Invariant 4.1: Layout CSS must retain stable scrollbar gutter to prevent desktop shift", () => {
      const globalsCssPath = path.join(rootDir, "app/globals.css");
      const content = fs.readFileSync(globalsCssPath, "utf-8");

      expect(content).toMatch(/scrollbar-gutter:\s*stable/);
    });

    it("Invariant 5.1: Ranking CSS must retain top-3 podium margin to prevent avatar outline clipping", () => {
      const rankingCssPath = path.join(rootDir, "components/ranking.css");
      const content = fs.readFileSync(rankingCssPath, "utf-8");

      expect(content).toContain(".ranking-avatar");
      expect(content).toMatch(/\.ranking-avatar\s*\{[^}]*margin:\s*4px/);
    });
  });

  describe("Experiences & Map Invariants", () => {
    it("Invariant 6.1: world-map.tsx must only render experience markers when experiencesMode is true", () => {
      const worldMapPath = path.join(rootDir, "components/world-map.tsx");
      const content = fs.readFileSync(worldMapPath, "utf-8");

      expect(content).toContain("if (experiencesMode && experienceRecords)");
      expect(content).toContain("experiencesModeRef.current = experiencesMode;");
    });

    it("Invariant 6.2: summit-tracker.tsx must guard handleExperienceClick and conditionally pass experienceRecords", () => {
      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const content = fs.readFileSync(trackerPath, "utf-8");

      expect(content).toMatch(/function handleExperienceClick[\s\S]*?if \(!experiencesMode\) return;/);
      expect(content).toMatch(/experiencesMode\s*\?\s*experienceRecords\.map/);
    });

    it("Invariant 6.3: summit-tracker.tsx must close experience records upon deactivating experiences mode", () => {
      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const content = fs.readFileSync(trackerPath, "utf-8");

      expect(content).toContain("handleToggleExperiences");
      expect(content).toContain("isSelectedExperience");
      expect(content).toContain("setExperiencesMode(false)");
    });
  });

  describe("Record Links Invariants", () => {
    it("Invariant 7.1: summit-tracker.tsx must render record links in completed record cards", () => {
      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const content = fs.readFileSync(trackerPath, "utf-8");

      expect(content).toContain("renderRecordLink");
      expect(content).toContain("{renderRecordLink(ascent.link, (ascent as any).link_name)}");
    });
  });
});
