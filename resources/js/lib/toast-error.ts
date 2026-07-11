import { toast } from 'sonner';
import { friendlyMessage } from './errors';

/**
 * Show a user-friendly toast for any error thrown by apiRequest(). Always
 * routes through friendlyMessage() so technical/backend strings never reach
 * the UI directly — use this instead of calling toast.error(err.message).
 */
export function toastApiError(err: unknown, fallback?: string) {
  toast.error(friendlyMessage(err) || fallback || 'Something went wrong. Please try again.');
}
