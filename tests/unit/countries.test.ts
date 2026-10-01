import { describe, it, expect } from "vitest";
import { countries } from "@/data/countries";

describe("Countries Dataset Integrity (196 países del mundo)", () => {
  it("should contain exactly 196 recognized countries/territories", () => {
    expect(countries).toHaveLength(196);
  });

  it("should have unique country ids formatted as country-xx", () => {
    const ids = countries.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(196);

    for (const id of ids) {
      expect(id).toMatch(/^country-[a-z0-9_-]+$/);
    }
  });

  it("should have valid ISO 3166-1 alpha-2 codes (2 uppercase letters)", () => {
    const isos = countries.map((c) => c.iso_a2);
    const uniqueIsos = new Set(isos);
    expect(uniqueIsos.size).toBe(196);

    for (const iso of isos) {
      expect(iso).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("should have valid ISO 3166-1 numeric strings (or -99 for Kosovo) for TopoJSON matching", () => {
    for (const c of countries) {
      if (c.id === "country-xk") {
        expect(c.iso_n3).toBe("-99");
      } else {
        expect(c.iso_n3).toMatch(/^\d{3}$/);
      }
    }
  });

  it("should have populated name, capital, and valid continent in Spanish", () => {
    const validContinents = new Set([
      "África",
      "América",
      "Asia",
      "Europa",
      "Oceanía",
    ]);

    for (const c of countries) {
      expect(c.name.trim()).not.toBe("");
      expect(c.capital.trim()).not.toBe("");
      expect(validContinents.has(c.continent)).toBe(true);
    }
  });

  it("should validate geographic coordinates when provided", () => {
    for (const c of countries) {
      if (c.coordinates) {
        const [lat, lng] = c.coordinates;
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
      }
    }
  });
});
