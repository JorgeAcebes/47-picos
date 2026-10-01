import { describe, it, expect } from "vitest";
import { regionsByCountryIsoA2 } from "@/data/regions";

describe("Sub-national Regions Dataset Integrity", () => {
  it("should contain mapped regions keyed by ISO 3166-1 alpha-2 codes", () => {
    const countryKeys = Object.keys(regionsByCountryIsoA2);
    expect(countryKeys.length).toBeGreaterThan(0);

    for (const key of countryKeys) {
      expect(key).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("should contain valid region objects with id and non-empty name", () => {
    for (const [countryCode, regions] of Object.entries(regionsByCountryIsoA2)) {
      expect(regions.length).toBeGreaterThan(0);

      const regionIds = new Set<string>();
      for (const region of regions) {
        expect(region.id).toBeTruthy();
        expect(region.id).toMatch(/^region-/);
        expect(region.name.trim()).not.toBe("");
        expect(regionIds.has(region.id)).toBe(false);
        regionIds.add(region.id);
      }
    }
  });
});
