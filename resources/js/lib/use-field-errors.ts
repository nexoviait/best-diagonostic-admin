import { useCallback, useState } from "react";
import { ApiError, type FieldErrors } from "./errors";

/**
 * Tracks per-field validation messages for a form. Feed it the error from a
 * failed mutation (onFieldErrors) and it extracts any backend field-level
 * messages; call clear(field) as the user edits a field so the message
 * disappears once they start correcting it.
 */
export function useFieldErrors() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const setFromError = useCallback((err: unknown) => {
    setFieldErrors(err instanceof ApiError ? err.fields : {});
  }, []);

  const clear = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setFieldErrors({}), []);

  return { fieldErrors, setFromError, clear, clearAll };
}
