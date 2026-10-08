export async function compressImage(
  file: File | Blob,
  maxWidthPx = 1200,
  quality = 0.75,
  targetFormat: "image/webp" | "image/jpeg" = "image/webp"
): Promise<Blob> {
  let bitmap: ImageBitmap | null = null;
  try {
    // createImageBitmap is widely supported and efficient for this
    bitmap = await createImageBitmap(file);

    let width = bitmap.width;
    let height = bitmap.height;

    // Scale down if dimensions exceed the maximum allowed
    if (width > maxWidthPx || height > maxWidthPx) {
      const ratio = Math.min(maxWidthPx / width, maxWidthPx / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file; // Fallback in case canvas isn't supported

    // Detect if image format may contain an alpha channel (PNG, WebP, GIF, SVG)
    const isTransparentFormat =
      !file.type ||
      file.type === "image/png" ||
      file.type === "image/webp" ||
      file.type === "image/gif" ||
      file.type === "image/svg+xml";

    // When exporting to JPEG, fill white background to prevent transparent pixels from becoming black
    if (targetFormat === "image/jpeg" && isTransparentFormat) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise((resolve) => {
      // First attempt target format (default: image/webp)
      canvas.toBlob(
        (blob) => {
          if (blob && (blob.type === "image/webp" || blob.type === "image/jpeg")) {
            resolve(blob);
          } else {
            // Fallback to JPEG if WebP blob generation is not supported
            if (isTransparentFormat) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(bitmap!, 0, 0, width, height);
            }
            canvas.toBlob(
              (fallbackBlob) => resolve(fallbackBlob || file),
              "image/jpeg",
              quality
            );
          }
        },
        targetFormat,
        quality
      );
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    return file; // Fallback to original if anything fails
  } finally {
    if (bitmap) {
      try {
        bitmap.close();
      } catch (err) {
        console.error("Error closing ImageBitmap:", err);
      }
    }
  }
}
