import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { apiRequest, setToken, setUser } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, Lock, User, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: settings } = useQuery<any>({
    queryKey: ["public-settings"],
    queryFn: () => apiRequest("/public/site-settings"),
  });
  const companyName = settings?.company_name_en || "Best Health";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
      });

      setToken(data.access_token);
      setUser(data.user);

      // Redirect to home/dashboard
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 -z-10 opacity-30" style={{ background: "radial-gradient(800px 300px at 50% 20%, oklch(0.58 0.14 180 / 0.15), transparent)" }} />
      <div className="absolute inset-0 -z-10 opacity-25" style={{ background: "radial-gradient(600px 300px at 10% 80%, oklch(0.72 0.13 180 / 0.1), transparent)" }} />

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-transparent overflow-hidden">
            <img src={settings?.logo_path || "/assets/images/best-logo.png"} alt="Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold tracking-tight text-foreground max-w-xs">
            {companyName}
          </h1>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-elevated text-slate-900">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="login" className="text-slate-700 font-semibold">Username or Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="login"
                  placeholder="admin or email@example.com"
                  className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-1"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 font-semibold">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary focus-visible:border-primary focus-visible:ring-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="gradient-primary w-full shadow-[var(--shadow-glow)] text-sm font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying account...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <p className="font-semibold text-slate-500">Developed by Nexovia IT Limited</p>
        </div>
      </div>
    </div>
  );
}
