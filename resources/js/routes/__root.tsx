import { QueryClientProvider, type QueryClient, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    // Log to console in development only
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  beforeLoad: ({ location }) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mediadmin_token") : null;
    const isPublicPage = ["/login", "/medical", "/search-passport"].includes(location.pathname);
    if (!token && !isPublicPage) {
      throw redirect({ to: "/login", replace: true });
    }
    if (token && location.pathname === "/login") {
      throw redirect({ to: "/", replace: true });
    }
  },
});

import { Toaster } from "sonner";
import { apiRequest, getToken, setToken } from "../lib/api";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["public-settings"],
    queryFn: () => apiRequest("/public/site-settings"),
  });

  useEffect(() => {
    const companyName = user?.company_name_en || settings?.company_name_en || "MediAdmin";
    document.title = `${companyName} — Medical Center`;
  }, [user, settings]);

  useEffect(() => {
    // Refresh JWT access token to extend session validity.
    // Refresh failures are non-fatal here: apiRequest() itself retries any
    // 401 with a fresh refresh before forcing a logout, so a missed beat in
    // this proactive refresh does not by itself log the user out.
    const refreshAccessToken = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const data = await apiRequest("/auth/refresh", { method: "POST" });
        if (data && data.access_token) {
          setToken(data.access_token);
        }
      } catch (err) {
        console.warn("[auth] proactive token refresh failed (will retry):", err);
      }
    };

    // setInterval is throttled/suspended in backgrounded tabs and stops
    // entirely across laptop sleep, so a token can silently outlive its TTL
    // while the tab is inactive. Re-checking on visibilitychange/focus
    // catches that case the moment the user comes back, instead of waiting
    // for the next interval tick (which may never fire in the background).
    const interval = setInterval(refreshAccessToken, 15 * 60 * 1000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        refreshAccessToken();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    // Also refresh once on mount in case the tab was left open across a
    // full-page load with an already-stale (but not yet expired) token.
    refreshAccessToken();

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/50 backdrop-blur-sm transition-all duration-300">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
