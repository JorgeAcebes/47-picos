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

    it("Invariant 7.2: summit-tracker.tsx must support a second link with subtle display and persistence", () => {
      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const content = fs.readFileSync(trackerPath, "utf-8");

      expect(content).toContain("link_2");
      expect(content).toContain("link_name_2");
      expect(content).toContain("showSecondLink");
      expect(content).toContain("renderRecordLink((ascent as any).link_2, (ascent as any).link_name_2)");
    });

    it("Invariant 7.3: feed-tab.tsx must select and render the second link in activity cards", () => {
      const feedPath = path.join(rootDir, "components/feed-tab.tsx");
      const content = fs.readFileSync(feedPath, "utf-8");

      expect(content).toContain("link_2");
      expect(content).toContain("link_name_2");
      expect(content).toContain("renderFeedLink(item.link_2, item.link_name_2)");
    });

    it("Invariant 7.4: Footprints icon must be assigned for hiking/running links and placeholder for second link must guide user", () => {
      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const trackerContent = fs.readFileSync(trackerPath, "utf-8");
      expect(trackerContent).toContain("Footprints");
      expect(trackerContent).toMatch(/strava\.com[\s\S]*?Icon\s*=\s*Footprints/);
      expect(trackerContent).toMatch(/wikiloc\.com[\s\S]*?Icon\s*=\s*Footprints/);
      expect(trackerContent).toContain('placeholder="Ej: Restaurante favorito"');

      const feedPath = path.join(rootDir, "components/feed-tab.tsx");
      const feedContent = fs.readFileSync(feedPath, "utf-8");
      expect(feedContent).toContain("Footprints");
      expect(feedContent).toMatch(/strava\.com[\s\S]*?Icon\s*=\s*Footprints/);
      expect(feedContent).toMatch(/wikiloc\.com[\s\S]*?Icon\s*=\s*Footprints/);
    });

    it("Invariant 7.5: Country record dialog must omit continent, dropzone must disable on 4 photos, and second link container must omit dashed border", () => {
      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const trackerContent = fs.readFileSync(trackerPath, "utf-8");
      expect(trackerContent).toMatch(/countries\.some\(\(c\)\s*=>\s*c\.id\s*===\s*selected\.id\)\s*\?\s*null\s*:/);
      expect(trackerContent).toContain("isPhotoLimitReached");
      expect(trackerContent).toContain("file-dropzone--disabled");
      expect(trackerContent).not.toMatch(/borderTop:\s*"1px dashed/);

      const globalsCssPath = path.join(rootDir, "app/globals.css");
      const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");
      expect(globalsCss).toContain(".file-dropzone--disabled");
    });
  });

  describe("Test Profile Stealth & Isolation Invariants", () => {
    it("Invariant 8.1: ranking-tab.tsx must exclude is_test profiles from user counts", () => {
      const rankingPath = path.join(rootDir, "components/ranking-tab.tsx");
      const content = fs.readFileSync(rankingPath, "utf-8");
      expect(content).toContain(".neq('is_test', true)");
    });

    it("Invariant 8.2: feed-tab.tsx must exclude activities from is_test profiles", () => {
      const feedPath = path.join(rootDir, "components/feed-tab.tsx");
      const content = fs.readFileSync(feedPath, "utf-8");
      expect(content).toContain("if (a.profiles?.is_test) return false;");
      expect(content).toContain("if (e.profiles?.is_test) return false;");
    });

    it("Invariant 8.3: social-tab.tsx must exclude is_test profiles from search and recommendations", () => {
      const socialPath = path.join(rootDir, "components/social-tab.tsx");
      const content = fs.readFileSync(socialPath, "utf-8");
      expect(content).toContain(".neq('is_test', true)");
    });

    it("Invariant 8.4: migration 023 must define is_test on profiles and update get_user_ranking", () => {
      const migrationPath = path.join(rootDir, "supabase/migrations/023_test_profiles_exclusion.sql");
      expect(fs.existsSync(migrationPath)).toBe(true);
      const content = fs.readFileSync(migrationPath, "utf-8");
      expect(content).toContain("is_test BOOLEAN NOT NULL DEFAULT false");
      expect(content).toContain("p.is_test IS NOT TRUE");
    });
  });

  describe("Mobile Scroll Locking & Photo Lightbox History Invariants", () => {
    it("Invariant 9.1: feed-tab.tsx must push #lightbox state and listen to popstate to close lightbox without leaving feed", () => {
      const feedPath = path.join(rootDir, "components/feed-tab.tsx");
      const content = fs.readFileSync(feedPath, "utf-8");

      expect(content).toContain('window.history.pushState({ feedLightbox: true }, "", "#lightbox")');
      expect(content).toContain('window.addEventListener("popstate", handleCloseOnNavigation)');
      expect(content).toContain('window.addEventListener("hashchange", handleCloseOnNavigation)');
      expect(content).toContain("closeLightbox");
    });

    it("Invariant 9.2: Both feed-tab.tsx and summit-tracker.tsx must lock documentElement and body scroll when viewing photos", () => {
      const feedPath = path.join(rootDir, "components/feed-tab.tsx");
      const feedContent = fs.readFileSync(feedPath, "utf-8");
      expect(feedContent).toContain('document.documentElement.style.overflow = "hidden"');
      expect(feedContent).toContain('document.body.style.overflow = "hidden"');

      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const trackerContent = fs.readFileSync(trackerPath, "utf-8");
      expect(trackerContent).toContain('document.documentElement.style.overflow = "hidden"');
      expect(trackerContent).toContain('document.body.style.overflow = "hidden"');
    });

    it("Invariant 9.3: summit-tracker.tsx must lock background scroll on mobile when viewing a record", () => {
      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const content = fs.readFileSync(trackerPath, "utf-8");

      expect(content).toContain("isMobile && !!selected");
      expect(content).toContain("isScrollLocked");
    });

    it("Invariant 9.4: globals.css must contain overscroll-behavior and disable pointer-events on background elements on mobile", () => {
      const cssPath = path.join(rootDir, "app/globals.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain("overscroll-behavior: contain");
      expect(content).toContain("touch-action: none");
      expect(content).toMatch(/main\.panel-open\s+\.map-wrapper/);
      expect(content).toMatch(/pointer-events:\s*none/);
    });

    it("Invariant 9.5: globals.css must hide country summit pins at zoom levels 0 through 5 and by default in mode-countries", () => {
      const cssPath = path.join(rootDir, "app/globals.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain('.mode-countries .summit-pin:not(.summit-pin--experience)');
      expect(content).toContain('.mode-countries .map[data-zoom="0"] .summit-pin:not(.summit-pin--experience)');
      expect(content).toContain('.mode-countries .map[data-zoom="5"] .summit-pin:not(.summit-pin--experience)');
      expect(content).toContain('.map[data-zoom="0"] .summit-pin:not(.summit-pin--experience)');
    });

    it("Invariant 9.6: profile-settings.tsx must lock documentElement and body scroll when mounted", () => {
      const settingsPath = path.join(rootDir, "components/profile-settings.tsx");
      const content = fs.readFileSync(settingsPath, "utf-8");

      expect(content).toContain('document.documentElement.style.overflow = "hidden"');
      expect(content).toContain('document.body.style.overflow = "hidden"');
      expect(content).toContain('overscrollBehavior: "contain"');
    });
  });

  describe("Modality Preferences & Visibility Invariants", () => {
    it("Invariant 10.1: profile-settings.tsx must include toggles for both peaks and countries and prevent disabling both", () => {
      const settingsPath = path.join(rootDir, "components/profile-settings.tsx");
      const content = fs.readFileSync(settingsPath, "utf-8");

      expect(content).toContain("enablePeaks");
      expect(content).toContain("enableCountries");
      expect(content).toContain("!enablePeaks && !enableCountries");
    });

    it("Invariant 10.2: summit-tracker.tsx must guard mode-selector with hasBothModes", () => {
      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const content = fs.readFileSync(trackerPath, "utf-8");

      expect(content).toContain("hasBothModes && (");
      expect(content).toContain("canShowPeaks");
      expect(content).toContain("canShowCountries");
    });

    it("Invariant 10.3: ranking-tab.tsx must guard mode-selector with hasBothModes", () => {
      const rankingPath = path.join(rootDir, "components/ranking-tab.tsx");
      const content = fs.readFileSync(rankingPath, "utf-8");

      expect(content).toContain("hasBothModes && (");
      expect(content).toContain("enablePeaks");
      expect(content).toContain("enableCountries");
    });

    it("Invariant 10.4: feed-tab.tsx must filter out posts of disabled modalities", () => {
      const feedPath = path.join(rootDir, "components/feed-tab.tsx");
      const content = fs.readFileSync(feedPath, "utf-8");

      expect(content).toContain("visibleFeedItems");
      expect(content).toContain("!enablePeaks && isPeak");
      expect(content).toContain("!enableCountries && isCountry");
    });

    it("Invariant 10.5: migration 024 must exist and add enable_peaks and enable_countries to profiles", () => {
      const migrationPath = path.join(rootDir, "supabase/migrations/024_add_modalities_to_profiles.sql");
      expect(fs.existsSync(migrationPath)).toBe(true);
      const content = fs.readFileSync(migrationPath, "utf-8");
      expect(content).toContain("enable_peaks BOOLEAN DEFAULT true");
      expect(content).toContain("enable_countries BOOLEAN DEFAULT true");
    });
  });

  describe("Topbar Account Button & Modality Hierarchy Invariants", () => {
    it("Invariant 11.1: Topbar account button must ONLY display avatar and NEVER display email or username text", () => {
      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const rankingPath = path.join(rootDir, "components/ranking-tab.tsx");
      const socialPath = path.join(rootDir, "components/social-tab.tsx");

      const trackerContent = fs.readFileSync(trackerPath, "utf-8");
      const rankingContent = fs.readFileSync(rankingPath, "utf-8");
      const socialContent = fs.readFileSync(socialPath, "utf-8");

      for (const [name, content] of [
        ["summit-tracker.tsx", trackerContent],
        ["ranking-tab.tsx", rankingContent],
        ["social-tab.tsx", socialContent],
      ]) {
        // Must contain account-button and account-avatar
        expect(content, `${name} must include account-button`).toContain('className="account-button"');
        expect(content, `${name} must include account-avatar`).toContain('className="account-avatar"');

        // Must NOT render username or email text next to the avatar
        expect(content, `${name} must not render username text in account-button`).not.toMatch(
          /className="account-button"[\s\S]*?<span>\{myProfile\?\.username/
        );
        expect(content, `${name} must not render email text in account-button`).not.toMatch(
          /className="account-button"[\s\S]*?session\.user\.email\?\.split\("@"\)/
        );
        expect(content, `${name} must not contain account-username class`).not.toContain("account-username");
      }
    });

    it("Invariant 11.2: profile-settings.tsx must freeze experiences and regions when countries mode is disabled", () => {
      const settingsPath = path.join(rootDir, "components/profile-settings.tsx");
      const content = fs.readFileSync(settingsPath, "utf-8");

      expect(content).toContain("setEnableExperiences(false)");
      expect(content).toContain("setEnableRegions(false)");
      expect(content).toContain("enable_regions: enableCountries ? enableRegions : false");
      expect(content).toContain("enable_experiences: enableCountries ? enableExperiences : false");
      expect(content).toContain("disabled={!enableCountries}");
    });

    it("Invariant 11.3: summit-tracker.tsx must force experiencesMode and regionsMode to false if canShowCountries is false", () => {
      const trackerPath = path.join(rootDir, "components/summit-tracker.tsx");
      const content = fs.readFileSync(trackerPath, "utf-8");

      expect(content).toContain("if (!canShowCountries) {");
      expect(content).toContain("if (experiencesMode) setExperiencesMode(false)");
      expect(content).toContain("if (regionsMode) setRegionsMode(false)");
    });
  });
});

