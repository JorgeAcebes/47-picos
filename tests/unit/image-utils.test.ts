import { describe, it, expect } from "vitest";
import { compressImage } from "@/lib/image-utils";

describe("Image Compression Utilities", () => {
  it("should gracefully fallback to original Blob when canvas/createImageBitmap are not available in node env", async () => {
    const mockBlob = new Blob(["fake image data"], { type: "image/jpeg" });
    const result = await compressImage(mockBlob);

    expect(result).toBeDefined();
    expect(result.size).toBe(mockBlob.size);
    expect(result.type).toBe(mockBlob.type);
  });

  it("should respect maxWidthPx and quality arguments without crashing", async () => {
    const mockBlob = new Blob(["test-pixels"], { type: "image/png" });
    const result = await compressImage(mockBlob, 800, 0.6);

    expect(result).toBeDefined();
    expect(result).toBe(mockBlob);
  });
});
