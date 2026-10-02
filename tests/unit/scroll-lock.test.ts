import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { lockScroll, unlockScroll, resetScrollLock } from "@/lib/scroll-lock";

describe("Reference-counted Scroll Lock", () => {
  let fakeDoc: any;

  beforeEach(() => {
    fakeDoc = {
      documentElement: { style: { overflow: "" } },
      body: { style: { overflow: "" } },
    };
    (global as any).document = fakeDoc;
    resetScrollLock();
  });

  afterEach(() => {
    delete (global as any).document;
  });

  it("should lock documentElement and body scroll on lockScroll()", () => {
    expect(fakeDoc.documentElement.style.overflow).toBe("");
    expect(fakeDoc.body.style.overflow).toBe("");

    lockScroll();

    expect(fakeDoc.documentElement.style.overflow).toBe("hidden");
    expect(fakeDoc.body.style.overflow).toBe("hidden");
  });

  it("should unlock documentElement and body scroll when unlockScroll() is called", () => {
    lockScroll();
    expect(fakeDoc.documentElement.style.overflow).toBe("hidden");

    unlockScroll();
    expect(fakeDoc.documentElement.style.overflow).toBe("");
    expect(fakeDoc.body.style.overflow).toBe("");
  });

  it("should handle nested locks correctly with reference counting", () => {
    lockScroll(); // modal 1
    lockScroll(); // modal 2

    expect(fakeDoc.documentElement.style.overflow).toBe("hidden");

    unlockScroll(); // modal 2 closes
    // modal 1 still active: must remain locked
    expect(fakeDoc.documentElement.style.overflow).toBe("hidden");
    expect(fakeDoc.body.style.overflow).toBe("hidden");

    unlockScroll(); // modal 1 closes
    // all closed: must be completely unlocked
    expect(fakeDoc.documentElement.style.overflow).toBe("");
    expect(fakeDoc.body.style.overflow).toBe("");
  });

  it("should not crash or leave invalid state if unlocked more times than locked", () => {
    unlockScroll();
    unlockScroll();
    expect(fakeDoc.documentElement.style.overflow).toBe("");
    expect(fakeDoc.body.style.overflow).toBe("");

    lockScroll();
    expect(fakeDoc.documentElement.style.overflow).toBe("hidden");

    unlockScroll();
    expect(fakeDoc.documentElement.style.overflow).toBe("");
  });

  it("should reset completely with resetScrollLock()", () => {
    lockScroll();
    lockScroll();
    expect(fakeDoc.documentElement.style.overflow).toBe("hidden");

    resetScrollLock();
    expect(fakeDoc.documentElement.style.overflow).toBe("");
    expect(fakeDoc.body.style.overflow).toBe("");
  });
});
