import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Pencil, Trash2, Save, RefreshCw, Loader2, Sparkles, CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import { exportReportPdf, exportReportCsv, formatMoney } from "@/lib/report-export";

export const Route = createFileRoute("/payroll")({ component: PayrollPage });

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function yearOptions() {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current - 2; y <= current + 1; y++) years.push(String(y));
  return years;
}

function PayrollPage() {
  const queryClient = useQueryClient();
  const now = new Date();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [basicSalary, setBasicSalary] = useState("");
  const [allowances, setAllowances] = useState("0");
  const [deductions, setDeductions] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [remarks, setRemarks] = useState("");

  const [genMonth, setGenMonth] = useState(String(now.getMonth() + 1));
  const [genYear, setGenYear] = useState(String(now.getFullYear()));

  // Filters — Radix Select can't use an empty string as an item value, so "all" is the
  // sentinel for "no filter" and gets translated to "" before it reaches the query params.
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    employee: "",
    status: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canManagePayroll = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('manage_payroll');

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["employees"],
    queryFn: () => apiRequest("/employees"),
  });

  const employeeOptions = employees.map((e) => ({ value: String(e.id), label: `${e.name} (${e.employee_code})` }));
  const filterEmployeeOptions = [{ value: "", label: "All Employees" }, ...employeeOptions];

  const { data: payrolls = [], isLoading } = useQuery<any[]>({
    queryKey: ["payrolls", appliedFilters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (appliedFilters.month) params.append("month", appliedFilters.month);
      if (appliedFilters.year) params.append("year", appliedFilters.year);
      if (appliedFilters.employee) params.append("employee_id", appliedFilters.employee);
      if (appliedFilters.status) params.append("payment_status", appliedFilters.status);
      return apiRequest(`/payrolls?${params.toString()}`);
    },
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      month: filterMonth === "all" ? "" : filterMonth,
      year: filterYear === "all" ? "" : filterYear,
      employee: filterEmployeeId,
      status: filterStatus === "all" ? "" : filterStatus,
    });
  };
  const handleResetFilters = () => {
    setFilterMonth("all");
    setFilterYear("all");
    setFilterEmployeeId("");
    setFilterStatus("all");
    setAppliedFilters({ month: "", year: "", employee: "", status: "" });
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/payrolls/generate", {
        method: "POST",
        body: JSON.stringify({ month: genMonth, year: genYear }),
      });
    },
    onSuccess: (res: any) => {
      toast.success(res.message || "Payroll generated.");
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to generate payroll.");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/payrolls", {
        method: "POST",
        body: JSON.stringify({
          employee_id: employeeId, month, year, basic_salary: basicSalary,
          allowances, deductions, remarks,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Payroll record added successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to add payroll record.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      return apiRequest(`/payrolls/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({
          basic_salary: basicSalary, allowances, deductions,
          payment_status: paymentStatus, remarks,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Payroll record updated successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update payroll record.");
    },
  });

  const quickMarkPaidMutation = useMutation({
    mutationFn: async (p: any) => {
      return apiRequest(`/payrolls/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({
          basic_salary: p.basic_salary, allowances: p.allowances, deductions: p.deductions,
          payment_status: "Paid", remarks: p.remarks,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Marked as paid.");
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update payment status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/payrolls/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Payroll record deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete payroll record.");
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this payroll record?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (p: any) => {
    setSelectedId(String(p.id));
    setEmployeeId(String(p.employee_id));
    setMonth(String(p.month));
    setYear(String(p.year));
    setBasicSalary(String(p.basic_salary));
    setAllowances(String(p.allowances));
    setDeductions(String(p.deductions));
    setPaymentStatus(p.payment_status);
    setRemarks(p.remarks || "");
  };

  const handleClear = () => {
    setSelectedId(null);
    setEmployeeId("");
    setMonth(String(now.getMonth() + 1));
    setYear(String(now.getFullYear()));
    setBasicSalary("");
    setAllowances("0");
    setDeductions("0");
    setPaymentStatus("Pending");
    setRemarks("");
  };

  const handleEmployeeChangeForNew = (id: string) => {
    setEmployeeId(id);
    const emp = employees.find((e) => String(e.id) === id);
    if (emp && !selectedId) setBasicSalary(String(emp.basic_salary));
  };

  const totalPages = Math.ceil(payrolls.length / itemsPerPage);
  const paginatedPayrolls = payrolls.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalNet = payrolls.reduce((acc: number, p: any) => acc + (Number(p.net_salary) || 0), 0);
  const totalPending = payrolls.filter((p: any) => p.payment_status === "Pending").length;
  const totalBasic = payrolls.reduce((acc: number, p: any) => acc + (Number(p.basic_salary) || 0), 0);
  const totalAllowances = payrolls.reduce((acc: number, p: any) => acc + (Number(p.allowances) || 0), 0);
  const totalDeductions = payrolls.reduce((acc: number, p: any) => acc + (Number(p.deductions) || 0), 0);

  const periodLabel = `Period: ${appliedFilters.month ? MONTH_NAMES[Number(appliedFilters.month) - 1] : "All Months"} ${appliedFilters.year || ""}`.trim();

  const handleExportPdf = () => {
    exportReportPdf({
      filenamePrefix: "Payroll_Report",
      reportTitle: "Payroll Report",
      periodLabel,
      user,
      summary: [
        { label: "Total Records", value: String(payrolls.length) },
        { label: "Pending", value: String(totalPending) },
        { label: "Total Net", value: `BDT ${formatMoney(totalNet)}` },
      ],
      columns: [
        { header: "Employee", width: 38, render: (p) => String(p.employee?.name || "N/A").substring(0, 22) },
        { header: "Period", width: 26, render: (p) => `${MONTH_NAMES[p.month - 1]?.substring(0, 3)} ${p.year}` },
        { header: "Basic", width: 24, align: "right", render: (p) => formatMoney(p.basic_salary) },
        { header: "Allow.", width: 22, align: "right", render: (p) => formatMoney(p.allowances) },
        { header: "Deduct.", width: 22, align: "right", render: (p) => formatMoney(p.deductions) },
        { header: "Net (BDT)", width: 28, align: "right", render: (p) => formatMoney(p.net_salary) },
        { header: "Status", width: 22, render: (p) => p.payment_status },
      ],
      rows: payrolls,
      totalsRow: [
        "TOTAL", null,
        formatMoney(totalBasic), formatMoney(totalAllowances), formatMoney(totalDeductions), formatMoney(totalNet),
        null,
      ],
    });
  };

  const handleExportCsv = () => {
    exportReportCsv(
      [
        { header: "Employee", render: (p) => p.employee?.name || "N/A" },
        { header: "Employee ID", render: (p) => p.employee?.employee_code || "N/A" },
        { header: "Month", render: (p) => MONTH_NAMES[p.month - 1] },
        { header: "Year", render: (p) => p.year },
        { header: "Basic Salary (BDT)", render: (p) => formatMoney(p.basic_salary) },
        { header: "Allowances (BDT)", render: (p) => formatMoney(p.allowances) },
        { header: "Deductions (BDT)", render: (p) => formatMoney(p.deductions) },
        { header: "Net Salary (BDT)", render: (p) => formatMoney(p.net_salary) },
        { header: "Payment Status", render: (p) => p.payment_status },
        { header: "Payment Date", render: (p) => p.payment_date || "N/A" },
      ],
      payrolls,
      "Payroll_Report",
      [
        "TOTAL", "", "", "",
        formatMoney(totalBasic), formatMoney(totalAllowances), formatMoney(totalDeductions), formatMoney(totalNet),
        "", "",
      ],
    );
  };

  return (
    <DashboardShell title="Payroll Management" subtitle="Generate, review, and settle monthly payroll for active employees.">
      <div className={`grid min-w-0 grid-cols-1 gap-6 ${canManagePayroll ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {canManagePayroll && (
          <div className="min-w-0 space-y-6">
            <div className="card-surface min-w-0 p-5 h-fit space-y-3">
              <h3 className="font-display text-base font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Generate Payroll
              </h3>
              <p className="text-xs text-muted-foreground">
                Creates a Pending payroll row for every active employee who doesn't already have one for the selected period, seeded from their basic salary.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Month</Label>
                  <Select value={genMonth} onValueChange={setGenMonth}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, idx) => (
                        <SelectItem key={idx} value={String(idx + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Year</Label>
                  <Select value={genYear} onValueChange={setGenYear}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {yearOptions().map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="gradient-primary w-full" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                Generate Payroll
              </Button>
            </div>

            <div className="card-surface min-w-0 p-5 h-fit space-y-4">
              <h3 className="font-display text-base font-semibold">
                {selectedId ? "Edit Payroll Record" : "Add Payroll Record"}
              </h3>
              <div className="dark-fields-panel space-y-3 rounded-xl border border-black/20 bg-[#5c5c5c] p-4">
                <div>
                  <Label>Employee *</Label>
                  <Combobox
                    value={employeeId}
                    onChange={handleEmployeeChangeForNew}
                    options={employeeOptions}
                    placeholder="Select employee"
                    searchPlaceholder="Search employees..."
                    emptyText="No employees found."
                    disabled={!!selectedId}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Month</Label>
                    <Select value={month} onValueChange={setMonth} disabled={!!selectedId}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((m, idx) => (
                          <SelectItem key={idx} value={String(idx + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={year} onValueChange={setYear} disabled={!!selectedId}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {yearOptions().map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Basic Salary (৳)</Label>
                  <Input type="number" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Allowances (৳)</Label>
                    <Input type="number" value={allowances} onChange={(e) => setAllowances(e.target.value)} />
                  </div>
                  <div>
                    <Label>Deductions (৳)</Label>
                    <Input type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
                  </div>
                </div>
                {selectedId && (
                  <div>
                    <Label>Payment Status</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Remarks</Label>
                  <Textarea rows={2} placeholder="Optional notes" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                {!selectedId ? (
                  <Button
                    className="gradient-primary flex-1"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !employeeId || !basicSalary}
                  >
                    {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Save
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateMutation.mutate()}
                      disabled={updateMutation.isPending || !basicSalary}
                    >
                      {updateMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                      Update
                    </Button>
                    <Button variant="ghost" className="flex-1" onClick={handleClear}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="min-w-0 space-y-4">
          <div className="card-surface flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full sm:w-[150px]">
              <Label className="text-xs">Month</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTH_NAMES.map((m, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[120px]">
              <Label className="text-xs">Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {yearOptions().map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[220px]">
              <Label className="text-xs">Employee</Label>
              <Combobox value={filterEmployeeId} onChange={setFilterEmployeeId} options={filterEmployeeOptions} placeholder="All Employees" />
            </div>
            <div className="w-full sm:w-[150px]">
              <Label className="text-xs">Payment Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <Button onClick={handleApplyFilters} className="gradient-primary">Filter</Button>
              <Button variant="outline" onClick={handleResetFilters}>Reset</Button>
            </div>
          </div>

          <div className="card-surface min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold">Payroll Records</h3>
                  <p className="text-xs text-muted-foreground">{payrolls.length} records · {totalPending} pending</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={handleExportCsv}>
                      <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPdf}>
                      <Download className="mr-1 h-3.5 w-3.5" />PDF
                    </Button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Net</p>
                    <p className="font-mono font-semibold text-primary">৳{totalNet.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-slate-50/50">
                      <th className="px-5 py-3 font-medium w-12">SL</th>
                      <th className="px-5 py-3 font-medium">Employee</th>
                      <th className="px-5 py-3 font-medium">Period</th>
                      <th className="px-5 py-3 text-right font-medium">Basic (৳)</th>
                      <th className="px-5 py-3 text-right font-medium">Allowances (৳)</th>
                      <th className="px-5 py-3 text-right font-medium">Deductions (৳)</th>
                      <th className="px-5 py-3 text-right font-medium">Net (৳)</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-6 text-center text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            Loading list...
                          </div>
                        </td>
                      </tr>
                    ) : paginatedPayrolls.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-6 text-center text-muted-foreground">
                          No payroll records found for this filter. Use Generate Payroll to create one.
                        </td>
                      </tr>
                    ) : (
                      paginatedPayrolls.map((p, i) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                        return (
                          <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                            <td className="px-5 py-3 font-mono text-xs text-slate-500">{globalIndex}</td>
                            <td className="px-5 py-3">
                              <div className="font-semibold text-slate-800">{p.employee?.name || "—"}</div>
                              <div className="text-xs text-muted-foreground font-mono">{p.employee?.employee_code}</div>
                            </td>
                            <td className="px-5 py-3 text-slate-600 text-xs">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                            <td className="px-5 py-3 text-right font-mono text-slate-700">{(Number(p.basic_salary) || 0).toLocaleString()}</td>
                            <td className="px-5 py-3 text-right font-mono text-emerald-600">{(Number(p.allowances) || 0).toLocaleString()}</td>
                            <td className="px-5 py-3 text-right font-mono text-rose-600">{(Number(p.deductions) || 0).toLocaleString()}</td>
                            <td className="px-5 py-3 text-right font-mono font-semibold text-slate-800">{(Number(p.net_salary) || 0).toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                p.payment_status === "Paid"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                                {p.payment_status}
                              </span>
                              {p.payment_status === "Paid" && p.payment_date && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">{p.payment_date}</div>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                {canManagePayroll && p.payment_status === "Pending" && (
                                  <Button variant="ghost" size="sm" className="text-emerald-600 hover:bg-emerald-50" onClick={() => quickMarkPaidMutation.mutate(p)} disabled={quickMarkPaidMutation.isPending}>
                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Mark Paid
                                  </Button>
                                )}
                                {canManagePayroll && (
                                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => handleSelectForEdit(p)}>
                                    <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                  </Button>
                                )}
                                {canManagePayroll && (
                                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5" onClick={() => handleDelete(String(p.id))} disabled={deleteMutation.isPending}>
                                    <Trash2 className="mr-1 h-3.5 w-3.5" />Delete
                                  </Button>
                                )}
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

            {payrolls.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, payrolls.length)} to {Math.min(currentPage * itemsPerPage, payrolls.length)} of {payrolls.length} entries
                </span>
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
