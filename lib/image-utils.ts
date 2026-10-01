export async function compressImage(
  file: File | Blob,
  maxWidthPx = 1200,
  quality = 0.75
): Promise<Blob> {
  try {
    // createImageBitmap is widely supported and efficient for this
    const bitmap = await createImageBitmap(file);

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

    ctx.drawImage(bitmap, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file); // Fallback to original if blob creation fails
          }
        },
        "image/jpeg",
        quality
      );
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    return file; // Fallback to original if anything fails
  }
}
