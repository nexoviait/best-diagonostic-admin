import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileCheck2,
  ScanLine,
  Wallet,
  Activity,
  ArrowUpRight,
  Plus,
  ClipboardList,
  Building2,
  Globe2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getUser } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: Overview,
});

const statusStyles: Record<string, string> = {
  Fit: "bg-success/15 text-success border-success/30",
  Pending: "bg-warning/20 text-warning-foreground border-warning/40",
  Unfit: "bg-destructive/15 text-destructive border-destructive/30",
};

const quickLinks = [
  { title: "New Patient Entry", desc: "Create a new medical entry", icon: Plus, url: "/entry-form" },
  { title: "Malaysia Report", desc: "Fill Malaysia medical report", icon: ClipboardList, url: "/malaysia-report" },
  { title: "Upload X-Ray", desc: "Attach X-Ray to a patient", icon: ScanLine, url: "/xray" },
  { title: "Agency Balance", desc: "Track receivables & dues", icon: Wallet, url: "/agency-balance" },
];

function Overview() {
  const user = getUser();
  const userName = user?.name || "Dr. Tahsin";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => apiRequest("/dashboard"),
  });

  const recentPatients = stats?.recent_patients || [];

  return (
    <DashboardShell title="Overview" subtitle="Welcome back — here's what's happening today.">
      {/* Hero */}
      <section className="card-surface relative overflow-hidden p-6 md:p-8">
        <div className="absolute inset-0 -z-10 opacity-60" style={{ background: "radial-gradient(600px 200px at 100% 0%, oklch(0.72 0.13 180 / 0.25), transparent)" }} />
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-3">
              Today · {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
            </Badge>
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return "Good morning";
                if (hour < 18) return "Good afternoon";
                return "Good evening";
              })()}, {userName}.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage patient entries, medical reports, X-rays and partner accounts in one clean console.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/database">View database</Link></Button>
            <Button asChild className="gradient-primary"><Link to="/entry-form"><Plus className="mr-1 h-4 w-4" />New entry</Link></Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={isLoading ? "..." : (stats?.total_patients ?? 0).toLocaleString()}
          delta="registered all-time"
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Reports Completed"
          value={isLoading ? "..." : (stats?.completed_reports ?? 0).toLocaleString()}
          delta="Fit or Unfit reports"
          icon={FileCheck2}
          tone="success"
        />
        <StatCard
          label="X-Rays Uploaded"
          value={isLoading ? "..." : (stats?.xray_uploaded ?? 0).toLocaleString()}
          delta="Radiology records"
          icon={ScanLine}
          tone="primary"
        />
        <StatCard
          label="Agency Receivables"
          value={isLoading ? "..." : `৳ ${(stats?.agency_receivables ?? 0).toLocaleString()}`}
          delta="Outstanding dues"
          icon={Wallet}
          tone="warning"
        />
      </section>

      {/* Main grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Recent entries */}
        <div className="card-surface lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 p-5">
            <div>
              <h3 className="font-display text-base font-semibold">Recent Patient Entries</h3>
              <p className="text-xs text-muted-foreground">Latest medical records submitted</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/database">View all <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Patient ID</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Country</th>
                  <th className="px-5 py-3 font-medium">Agency</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-muted-foreground">
                      Loading recent patients...
                    </td>
                  </tr>
                ) : recentPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-muted-foreground">
                      No patient records found.
                    </td>
                  </tr>
                ) : (
                  recentPatients.map((r: any) => (
                    <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3 font-mono text-xs text-primary font-semibold">{r.pax_id}</td>
                      <td className="px-5 py-3 font-medium">{r.first_name} {r.last_name || ""}</td>
                      <td className="px-5 py-3 text-muted-foreground">{r.country?.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{r.agency?.name}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${statusStyles[r.medical_report?.final_status || "Pending"]}`}>
                          {r.medical_report?.final_status || "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="card-surface p-5">
            <h3 className="font-display text-base font-semibold">Quick actions</h3>
            <p className="text-xs text-muted-foreground">Jump straight into daily tasks</p>
            <div className="mt-4 space-y-2">
              {quickLinks.map((q) => (
                <Link
                  key={q.url}
                  to={q.url}
                  className="group flex items-center gap-3 rounded-lg border border-transparent p-3 transition hover:border-border hover:bg-muted/40"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <q.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{q.title}</p>
                    <p className="text-xs text-muted-foreground">{q.desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="font-display text-base font-semibold">Directory</h3>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Link to="/agency-list" className="rounded-lg bg-muted/50 p-3 hover:bg-muted">
                <Building2 className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-display text-lg font-semibold">
                  {isLoading ? "..." : (stats?.total_agencies ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground">Agencies</p>
              </Link>
              <Link to="/country-list" className="rounded-lg bg-muted/50 p-3 hover:bg-muted">
                <Globe2 className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-display text-lg font-semibold">
                  {isLoading ? "..." : (stats?.total_countries ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground">Countries</p>
              </Link>
              <Link to="/mr-list" className="rounded-lg bg-muted/50 p-3 hover:bg-muted">
                <Users className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-display text-lg font-semibold">
                  {isLoading ? "..." : (stats?.total_mrs ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground">MRs</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
