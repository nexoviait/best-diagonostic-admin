import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, RefreshCw, FileSpreadsheet, Download, Loader2, Users, CheckCircle2, XCircle, Clock,
} from "lucide-react";

import { agencyApiRequest, getAgency } from "@/lib/agency-api";
import { toastApiError } from "@/lib/toast-error";
import { AgencyShell } from "@/components/agency/agency-shell";
import { StatusBadge } from "@/components/agency/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/agency-portal-reports")({ component: AgencyReportsPage });

interface Filters {
  from_date: string;
  to_date: string;
  status: string;
}

const emptyFilters: Filters = { from_date: "", to_date: "", status: "all" };

function AgencyReportsPage() {
  const agency = getAgency();
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 25;

  const { data: patients = [], isLoading, isFetching, refetch, error } = useQuery<any[]>({
    queryKey: ["agency-report", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);
      if (filters.status !== "all") params.append("status", filters.status);
      return agencyApiRequest(`/agency/patients?${params.toString()}`);
    },
  });

  if (error) {
    toastApiError(error, "Failed to load report data.");
  }

  const filtered = patients.filter((p: any) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
    return (
      p.pax_id?.toLowerCase().includes(q) ||
      p.passport_no?.toLowerCase().includes(q) ||
      fullName.includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const summary = {
    total: filtered.length,
    fit: filtered.filter((p: any) => p.medical_report?.final_status === "Fit").length,
    unfit: filtered.filter((p: any) => p.medical_report?.final_status === "Unfit").length,
    heldUp: filtered.filter((p: any) => p.medical_report?.final_status === "Held up").length,
  };

  const applyFilters = () => {
    setFilters(draft);
    setPage(1);
  };

  const resetFilters = () => {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    setSearch("");
    setPage(1);
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const headers = ["SL", "Pax ID", "Date", "First Name", "Last Name", "Passport No", "Country", "Report Status", "X-Ray Result"];
    const rows = filtered.map((p: any, i: number) => [
      i + 1,
      p.pax_id || "N/A",
      p.date || "N/A",
      p.first_name || "",
      p.last_name || "",
      p.passport_no || "N/A",
      p.country?.name || "N/A",
      p.medical_report?.final_status || "Pending",
      p.xray_report?.result || "Pending",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Agency_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel (CSV) file downloaded successfully!");
  };

  const handleExportPDF = async () => {
    if (filtered.length === 0) {
      toast.warning("No data to export");
      return;
    }

    try {
      // @ts-ignore
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "mm", "a4");
      let pageNumber = 1;

      const drawHeader = (): number => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text("BEST HEALTH DIAGNOSTIC LTD.", 14, 16);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`Agency Report — ${agency?.name || ""}`, 14, 22);

        const rangeText = `Period: ${filters.from_date || "All"} to ${filters.to_date || "All"}`;
        doc.text(rangeText, 14, 27);
        doc.setFontSize(8);
        doc.text(`Page ${pageNumber}`, 190, 27);

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 30, 196, 30);
        return 36;
      };

      const drawTableHeader = (y: number): number => {
        doc.setFillColor(15, 23, 42);
        doc.rect(14, y, 182, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text("SL", 16, y + 5.5);
        doc.text("PAX ID", 26, y + 5.5);
        doc.text("Date", 50, y + 5.5);
        doc.text("Patient Name", 70, y + 5.5);
        doc.text("Passport No", 120, y + 5.5);
        doc.text("Country", 155, y + 5.5);
        doc.text("Status", 178, y + 5.5);
        return y + 8;
      };

      let y = drawHeader();
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, 182, 12, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Total: ${summary.total}`, 18, y + 8);
      doc.text(`Fit: ${summary.fit}`, 65, y + 8);
      doc.text(`Unfit: ${summary.unfit}`, 110, y + 8);
      doc.text(`Held up: ${summary.heldUp}`, 155, y + 8);
      y += 18;

      y = drawTableHeader(y);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");

      filtered.forEach((p: any, index: number) => {
        if (y > 275) {
          doc.addPage();
          pageNumber++;
          y = drawHeader();
          y = drawTableHeader(y);
          doc.setTextColor(71, 85, 105);
          doc.setFont("helvetica", "normal");
        }

        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 5.5, "F");
        }

        doc.setFontSize(7.5);
        doc.text(String(index + 1), 16, y + 4);
        doc.text(p.pax_id || "N/A", 26, y + 4);
        doc.text(p.date || "N/A", 50, y + 4);
        const fullName = `${p.first_name || ""} ${p.last_name || ""}`;
        doc.text(fullName.substring(0, 22), 70, y + 4);
        doc.text(p.passport_no || "N/A", 120, y + 4);
        doc.text((p.country?.name || "N/A").substring(0, 14), 155, y + 4);
        doc.text(p.medical_report?.final_status || "Pending", 178, y + 4);

        y += 5.5;
      });

      doc.save(`Agency_Report_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF report downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate the PDF report.");
    }
  };

  return (
    <AgencyShell title="Reports" subtitle="Filter and export your agency's patient records">
      <div className="dark-fields-panel grid gap-3 rounded-xl border border-black/20 bg-[#5c5c5c] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs text-white/80">From</Label>
          <DatePicker value={draft.from_date} onChange={(v) => setDraft((f) => ({ ...f, from_date: v }))} />
        </div>
        <div>
          <Label className="text-xs text-white/80">To</Label>
          <DatePicker value={draft.to_date} onChange={(v) => setDraft((f) => ({ ...f, to_date: v }))} />
        </div>
        <div>
          <Label className="text-xs text-white/80">Status</Label>
          <Select value={draft.status} onValueChange={(v) => setDraft((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Fit">Fit</SelectItem>
              <SelectItem value="Unfit">Unfit</SelectItem>
              <SelectItem value="Held up">Held up</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={applyFilters} className="gradient-primary flex-1">
            <Search className="mr-1.5 h-4 w-4" /> Apply
          </Button>
          <Button variant="outline" onClick={resetFilters}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Total</div>
          <p className="mt-1 font-display text-xl font-semibold">{summary.total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Fit</div>
          <p className="mt-1 font-display text-xl font-semibold text-success">{summary.fit}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5 text-destructive" /> Unfit</div>
          <p className="mt-1 font-display text-xl font-semibold text-destructive">{summary.unfit}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5 text-warning" /> Held up</div>
          <p className="mt-1 font-display text-xl font-semibold text-warning-foreground">{summary.heldUp}</p>
        </Card>
      </div>

      <div className="card-surface">
        <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-base font-semibold">Results</h3>
            <p className="text-xs text-muted-foreground">{filtered.length} matching records</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, Pax ID, passport..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">SL</th>
                <th className="px-5 py-3 font-medium">Pax ID</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Passport</th>
                <th className="px-5 py-3 font-medium">Country</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">X-Ray</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading report...
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-muted-foreground">
                    No matching records.
                  </td>
                </tr>
              ) : (
                paginated.map((p: any, i: number) => (
                  <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 text-muted-foreground">{(page - 1) * itemsPerPage + i + 1}</td>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-primary">{p.pax_id}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.date}</td>
                    <td className="px-5 py-3 font-medium">{p.first_name} {p.last_name || ""}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.passport_no || "N/A"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.country?.name || "N/A"}</td>
                    <td className="px-5 py-3"><StatusBadge label={p.medical_report?.final_status} /></td>
                    <td className="px-5 py-3 text-muted-foreground">{p.xray_report?.result || "Pending"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AgencyShell>
  );
}
