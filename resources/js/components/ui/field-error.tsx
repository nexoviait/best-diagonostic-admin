import { AlertCircle } from "lucide-react";

/**
 * Consistent inline validation message, rendered directly under a field.
 * Renders nothing when there's no message, so it's safe to always mount.
 */
export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
