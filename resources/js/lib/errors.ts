export type FieldErrors = Record<string, string>;

export type ApiErrorCode =
  | 'validation'
  | 'invalid_credentials'
  | 'session_expired'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'server'
  | 'network'
  | 'unknown';

/**
 * Thrown by apiRequest() for any non-ok response. Carries the raw per-field
 * validation messages (when the backend returned any) so callers can render
 * them under the relevant input instead of only showing a toast.
 */
export class ApiError extends Error {
  status: number;
  fields: FieldErrors;
  code: ApiErrorCode;

  constructor(message: string, status: number, fields: FieldErrors = {}, code: ApiErrorCode = 'unknown') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
    this.code = code;
  }
}

/** Laravel validator bodies come in two shapes: a raw `{field: [msg]}` map
 * (from `$validator->errors()` returned directly), or `{message, errors: {field: [msg]}}`
 * (from a FormRequest / thrown ValidationException). Normalize both to `{field: message}`. */
export function extractFieldErrors(data: unknown): FieldErrors {
  if (!data || typeof data !== 'object') return {};
  const raw = 'errors' in (data as any) && typeof (data as any).errors === 'object'
    ? (data as any).errors
    : data;
  if (!raw || typeof raw !== 'object') return {};

  const fields: FieldErrors = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      fields[key] = value[0];
    }
  }
  return fields;
}

/**
 * Turns any error thrown by apiRequest (or a raw network failure) into a
 * short, non-technical sentence safe to show a user in a toast.
 */
export function friendlyMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'invalid_credentials':
        // Already a user-facing sentence written by the login flow itself.
        return err.message;
      case 'session_expired':
        return 'Your session has expired. Please sign in again.';
      case 'forbidden':
        return err.message || "You don't have permission to perform this action.";
      case 'not_found':
        return 'The requested item could not be found.';
      case 'rate_limited':
        return 'Too many requests. Please wait a moment and try again.';
      case 'validation':
        return Object.keys(err.fields).length > 0
          ? 'Please correct the highlighted fields.'
          : err.message || 'Please correct the highlighted fields.';
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'server':
        return 'An unexpected error occurred. Please try again later.';
      default:
        return err.message || 'Something went wrong. Please try again.';
    }
  }

  // A bare fetch() rejects with TypeError when the network is unreachable
  // (offline, DNS failure, CORS block) — no response object exists at all.
  if (err instanceof TypeError) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  return 'Something went wrong. Please try again.';
}
