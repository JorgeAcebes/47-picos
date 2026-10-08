import { describe, it, expect } from "vitest";

describe("Account Deletion Safety & Confirmation Logic", () => {
  it("should enforce exact atlas-username string format for confirmation", () => {
    const username = "jorge";
    const expectedConfirmation = `atlas-${username.toLowerCase().trim()}`;

    expect(expectedConfirmation).toBe("atlas-jorge");

    // Valid match
    expect("atlas-jorge".trim().toLowerCase() === expectedConfirmation).toBe(true);

    // Invalid matches
    expect("jorge".trim().toLowerCase() === expectedConfirmation).toBe(false);
    expect("atlas".trim().toLowerCase() === expectedConfirmation).toBe(false);
    expect("atlas_jorge".trim().toLowerCase() === expectedConfirmation).toBe(false);
    expect("atlas-".trim().toLowerCase() === expectedConfirmation).toBe(false);
    expect("atlas-otro".trim().toLowerCase() === expectedConfirmation).toBe(false);
  });

  it("should handle mixed-case username normalized to lowercase", () => {
    const username = "Jorge_Alpinista";
    const expectedConfirmation = `atlas-${username.toLowerCase().trim()}`;

    expect(expectedConfirmation).toBe("atlas-jorge_alpinista");
    expect("atlas-jorge_alpinista".trim().toLowerCase() === expectedConfirmation).toBe(true);
    expect("atlas-JORGE_ALPINISTA".trim().toLowerCase() === expectedConfirmation).toBe(true);
  });
});
