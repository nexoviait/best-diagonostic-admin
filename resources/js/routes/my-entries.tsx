import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, ScanLine } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { DatePicker } from "@/components/ui/date-picker";

export const Route = createFileRoute("/my-entries")({
  component: MyEntriesPage,
});

function MyEntriesPage() {
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string }>({ from: "", to: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });

  const { data: patients = [], isLoading } = useQuery<any[]>({
    queryKey: ["patients", "mine", user?.id, appliedRange],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("created_by", String(user.id));
      if (appliedRange.from) params.append("from_date", appliedRange.from);
      if (appliedRange.to) params.append("to_date", appliedRange.to);
      return apiRequest(`/patients?${params.toString()}`);
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedRange]);

  const handleFilter = () => setAppliedRange({ from: dateFrom, to: dateTo });

  const totalFee = patients.reduce((acc, p) => acc + (Number(p.medical_fee) || 0), 0);
  const totalNiddle = patients.reduce((acc, p) => acc + (Number(p.niddle_charge) || 0), 0);
  const totalReceived = patients.reduce((acc, p) => acc + (Number(p.received_amount) || 0), 0);
  const totalDue = patients.reduce((acc, p) => acc + (Number(p.due_amount) || 0), 0);

  const totalPages = Math.ceil(patients.length / itemsPerPage);
  const paginatedPatients = patients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardShell title="My Entries" subtitle="Patient entries you have personally created.">
      <div className="card-surface mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-[160px]">
          <Label className="text-xs">From</Label>
          <DatePicker value={dateFrom} onChange={setDateFrom} />
        </div>
        <div className="w-full sm:w-[160px]">
          <Label className="text-xs">To</Label>
          <DatePicker value={dateTo} onChange={setDateTo} />
        </div>
        <Button onClick={handleFilter} className="w-full gradient-primary sm:ml-auto sm:w-auto">
          Filter
        </Button>
      </div>

      <div className="card-surface flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-border/60 p-5">
            <div>
              <h3 className="font-display text-base font-semibold">Results</h3>
              <p className="text-xs text-muted-foreground">{patients.length} entries created by you</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">Live</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">SL</th>
                  <th className="px-5 py-3 font-medium">Entry Date</th>
                  <th className="px-5 py-3 font-medium">Pax ID</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Agency</th>
                  <th className="px-5 py-3 font-medium">Report Status</th>
                  <th className="px-5 py-3 font-medium">X-Ray Result</th>
                  <th className="px-5 py-3 text-right font-medium">Total Fee (৳)</th>
                  <th className="px-5 py-3 text-right font-medium">Received (৳)</th>
                  <th className="px-5 py-3 text-right font-medium">Due (৳)</th>
                  <th className="px-5 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-6 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Loading records...
                      </div>
                    </td>
                  </tr>
                ) : paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-6 text-center text-muted-foreground">
                      You haven't created any entries yet.
                    </td>
                  </tr>
                ) : (
                  paginatedPatients.map((r, index) => {
                    const serialNum = (currentPage - 1) * itemsPerPage + index + 1;
                    const reportStatus = r.medicalReport?.final_status || "Pending";
                    const xrayStatus = r.xrayReport?.result || "Pending";
                    return (
                      <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-3 text-muted-foreground">{serialNum}</td>
                        <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
                        <td className="px-5 py-3 font-mono text-xs text-primary font-semibold">{r.pax_id}</td>
                        <td className="px-5 py-3 font-medium">{r.first_name} {r.last_name || ""}</td>
                        <td className="px-5 py-3 text-muted-foreground">{r.agency?.name || "N/A"}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            reportStatus === "FIT"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : reportStatus === "UNFIT"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {reportStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            xrayStatus === "Normal"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : xrayStatus === "Abnormal"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}>
                            {xrayStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-medium">{(Number(r.medical_fee) || 0).toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-success font-medium">{(Number(r.received_amount) || 0).toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-destructive font-medium">{(Number(r.due_amount) || 0).toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                              onClick={() => {
                                const route = r.country?.name?.toLowerCase() === 'malaysia' ? '/malaysia-report' : '/report-entry';
                                navigate({ to: route, search: { patient_id: r.pax_id } });
                              }}
                              title="Enter Medical Report"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => {
                                sessionStorage.setItem("xray_load_pax", r.pax_id);
                                navigate({ to: "/xray" });
                              }}
                              title="Upload X-Ray"
                            >
                              <ScanLine className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {patients.length > 0 && (
          <div className="border-t border-border/60 p-5 bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Totals</h4>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-5 text-sm">
              <div className="bg-background rounded-lg border p-3 flex flex-col">
                <span className="text-xs text-muted-foreground">Medical Fee</span>
                <span className="font-semibold mt-1">৳ {totalFee.toLocaleString()}</span>
              </div>
              <div className="bg-background rounded-lg border p-3 flex flex-col">
                <span className="text-xs text-muted-foreground">Needle Charge</span>
                <span className="font-semibold mt-1">৳ {totalNiddle.toLocaleString()}</span>
              </div>
              <div className="bg-background rounded-lg border p-3 flex flex-col">
                <span className="text-xs text-muted-foreground">Total Net</span>
                <span className="font-semibold mt-1 text-primary">৳ {(totalFee + totalNiddle).toLocaleString()}</span>
              </div>
              <div className="bg-background rounded-lg border p-3 flex flex-col">
                <span className="text-xs text-muted-foreground">Total Received</span>
                <span className="font-semibold mt-1 text-success">৳ {totalReceived.toLocaleString()}</span>
              </div>
              <div className="bg-background rounded-lg border p-3 flex flex-col">
                <span className="text-xs text-muted-foreground">Total Due</span>
                <span className="font-semibold mt-1 text-destructive">৳ {totalDue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {patients.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, patients.length)} to {Math.min(currentPage * itemsPerPage, patients.length)} of {patients.length} entries
            </span>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              {(() => {
                const getPageNumbers = (current: number, total: number) => {
                  const pages: (number | string)[] = [];
                  if (total <= 7) {
                    for (let i = 1; i <= total; i++) pages.push(i);
                  } else {
                    if (current <= 4) {
                      pages.push(1, 2, 3, 4, 5, '...', total);
                    } else if (current >= total - 3) {
                      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
                    } else {
                      pages.push(1, '...', current - 1, current, current + 1, '...', total);
                    }
                  }
                  return pages;
                };
                return getPageNumbers(currentPage, totalPages).map((page, idx) => {
                  if (page === '...') {
                    return (
                      <span key={`el-${idx}`} className="px-2 py-1 text-sm text-muted-foreground self-end">
                        ...
                      </span>
                    );
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${currentPage === page ? "gradient-primary text-white" : ""}`}
                      onClick={() => setCurrentPage(Number(page))}
                    >
                      {page}
                    </Button>
                  );
                });
              })()}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
