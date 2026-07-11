const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function formatSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${kb}KB`;
}

export interface ImageValidationOptions {
  /** Matches the backend's Laravel `max:` rule, in kilobytes. */
  maxSizeKB?: number;
  allowedTypes?: string[];
  required?: boolean;
}

/**
 * Client-side mirror of the backend's `image|mimes:...|max:...` rules, so
 * users see the same message immediately instead of only after a round
 * trip to the server. Returns null when the file is valid.
 */
export function validateImageFile(file: File | null, options: ImageValidationOptions = {}): string | null {
  const { maxSizeKB = 2048, allowedTypes = DEFAULT_ALLOWED_TYPES, required = false } = options;

  if (!file) {
    return required ? "Please select an image." : null;
  }

  if (!file.type.startsWith("image/")) {
    return "The selected file is not a valid image.";
  }

  if (!allowedTypes.includes(file.type)) {
    const extensions = allowedTypes.map((t) => t.split("/")[1]).join(", ");
    return `Unsupported image format. Allowed types: ${extensions}.`;
  }

  if (file.size / 1024 > maxSizeKB) {
    return `Image is too large. Maximum size is ${formatSize(maxSizeKB)}.`;
  }

  return null;
}
