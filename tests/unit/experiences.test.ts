import { describe, it, expect } from "vitest";
import { predefinedCategories } from "@/data/experiences";

describe("Predefined Experiences Dataset Integrity", () => {
  it("should have populated categories with valid metadata", () => {
    expect(predefinedCategories.length).toBeGreaterThan(0);

    for (const cat of predefinedCategories) {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(cat.iconName).toBeTruthy();
      expect(cat.experiences.length).toBeGreaterThan(0);
    }
  });

  it("should have globally unique category IDs", () => {
    const catIds = predefinedCategories.map((c) => c.id);
    const uniqueCatIds = new Set(catIds);
    expect(uniqueCatIds.size).toBe(catIds.length);
  });

  it("should have globally unique experience IDs across all categories", () => {
    const expIds: string[] = [];
    for (const cat of predefinedCategories) {
      for (const exp of cat.experiences) {
        expIds.push(exp.id);
      }
    }
    const uniqueExpIds = new Set(expIds);
    expect(uniqueExpIds.size).toBe(expIds.length);
  });

  it("should validate that subItems, if present, have unique ids within their experience", () => {
    for (const cat of predefinedCategories) {
      for (const exp of cat.experiences) {
        if (exp.subItems) {
          expect(exp.subItems.length).toBeGreaterThan(0);
          const subIds = exp.subItems.map((s) => s.id);
          const uniqueSubIds = new Set(subIds);
          expect(uniqueSubIds.size).toBe(subIds.length);
          for (const sub of exp.subItems) {
            expect(sub.name).toBeTruthy();
          }
        }
      }
    }
  });
});
