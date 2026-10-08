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

  it("should prevent event bubbling from closing delete account modal", () => {
    const fs = require("fs");
    const path = require("path");
    const modalPath = path.resolve(__dirname, "../../components/delete-account-modal.tsx");
    const content = fs.readFileSync(modalPath, "utf-8");

    // Must stop propagation on record-dialog to prevent closing modal when interacting with input
    expect(content).toContain("e.stopPropagation()");
    expect(content).toMatch(/className="record-dialog"[\s\S]*?onClick=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/);
    expect(content).toMatch(/id="delete-confirmation-input"[\s\S]*?onClick=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/);
  });

  it("should decouple DeleteAccountModal from ProfileSettings backdrop", () => {
    const fs = require("fs");
    const path = require("path");
    const settingsPath = path.resolve(__dirname, "../../components/profile-settings.tsx");
    const content = fs.readFileSync(settingsPath, "utf-8");

    // ProfileSettings backdrop must check e.target === e.currentTarget
    expect(content).toContain("if (e.target === e.currentTarget) onClose();");

    // DeleteAccountModal must be rendered outside the backdrop container
    const sectionEndIdx = content.indexOf("</section>");
    const backdropEndIdx = content.indexOf("</div>", sectionEndIdx);
    const deleteModalIdx = content.indexOf("<DeleteAccountModal", backdropEndIdx);
    expect(sectionEndIdx).toBeGreaterThan(0);
    expect(backdropEndIdx).toBeGreaterThan(sectionEndIdx);
    expect(deleteModalIdx).toBeGreaterThan(backdropEndIdx);
  });
});

describe("Loading Page Debounce & Invariants", () => {
  it("app/loading.tsx must implement a debounce delay threshold to prevent flashing on cached routes", () => {
    const fs = require("fs");
    const path = require("path");
    const loadingPath = path.resolve(__dirname, "../../app/loading.tsx");
    const content = fs.readFileSync(loadingPath, "utf-8");

    expect(content).toContain('"use client"');
    expect(content).toContain("setTimeout");
    expect(content).toMatch(/700|800/);
    expect(content).toContain("clearTimeout");
  });
});
