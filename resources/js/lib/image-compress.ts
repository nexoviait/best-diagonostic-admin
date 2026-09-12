/**
 * Client-side image compressor for patient photos, fingerprints, X-rays, etc.
 * Resizes and compresses images in the browser before upload to achieve ultra-lightweight
 * file sizes (e.g. ~2-20 KB) and fast instant uploads without server errors.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetKB?: number;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
}

/**
 * Compresses an image file (e.g. from file input, scanner, or camera).
 * Safely falls back to the original file if anything fails.
 */
export async function compressImageFile(
  file: File | null,
  options: CompressImageOptions = {}
): Promise<File | null> {
  if (!file) return null;
  if (!file.type.startsWith("image/")) return file;

  const {
    maxWidth = 600,
    maxHeight = 600,
    quality = 0.75,
    targetKB,
    mimeType = "image/jpeg",
  } = options;

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => resolve(file);

    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve(file);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(file);

      img.onload = async () => {
        try {
          let { naturalWidth: width, naturalHeight: height } = img;
          if (width <= 0 || height <= 0) {
            resolve(file);
            return;
          }

          // Calculate scaling ratio
          const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
          const targetWidth = Math.max(1, Math.round(width * ratio));
          const targetHeight = Math.max(1, Math.round(height * ratio));

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(file);
            return;
          }

          // Fill white background for JPEGs so transparent areas stay clean
          if (mimeType === "image/jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, targetWidth, targetHeight);
          }

          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Progressive compression to meet targetKB if provided
          if (targetKB && targetKB > 0) {
            const qualitySteps = [quality, 0.65, 0.5, 0.35, 0.2];
            let bestBlob: Blob | null = null;

            for (const q of qualitySteps) {
              const blob: Blob | null = await new Promise((res) =>
                canvas.toBlob((b) => res(b), mimeType, q)
              );

              if (blob) {
                if (!bestBlob || blob.size < bestBlob.size) {
                  bestBlob = blob;
                }
                if (blob.size <= targetKB * 1024) {
                  bestBlob = blob;
                  break;
                }
              }
            }

            if (bestBlob) {
              const baseName = file.name.replace(/\.[^/.]+$/, "");
              const outExt = mimeType === "image/png" ? ".png" : ".jpg";
              resolve(new File([bestBlob], baseName + outExt, { type: mimeType }));
              return;
            }
          }

          // Standard single-pass compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const baseName = file.name.replace(/\.[^/.]+$/, "");
                const outExt = mimeType === "image/png" ? ".png" : ".jpg";
                resolve(new File([blob], baseName + outExt, { type: mimeType }));
              } else {
                resolve(file);
              }
            },
            mimeType,
            quality
          );
        } catch {
          resolve(file);
        }
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
