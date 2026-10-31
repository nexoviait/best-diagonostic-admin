import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Pencil, Trash2, Save, RefreshCw, Loader2, Paperclip, Download, FileSpreadsheet } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import { exportReportPdf, exportReportCsv, formatMoney } from "@/lib/report-export";

export const Route = createFileRoute("/revenue")({ component: RevenuePage });

function RevenuePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [isRecurring, setIsRecurring] = useState("0");
  const [description, setDescription] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterVendorId, setFilterVendorId] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ from: "", to: "", category: "", vendor: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canManageFinance = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('manage_finance');
  const showForm = canManageFinance;

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["finance-categories", "revenue"],
    queryFn: () => apiRequest("/finance-categories?type=revenue"),
  });
  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ["vendors"],
    queryFn: () => apiRequest("/vendors"),
  });
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => apiRequest("/projects"),
  });

  const { data: revenues = [], isLoading } = useQuery<any[]>({
    queryKey: ["revenues", appliedFilters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (appliedFilters.from) params.append("from_date", appliedFilters.from);
      if (appliedFilters.to) params.append("to_date", appliedFilters.to);
      if (appliedFilters.category) params.append("finance_category_id", appliedFilters.category);
      if (appliedFilters.vendor) params.append("vendor_id", appliedFilters.vendor);
      return apiRequest(`/revenues?${params.toString()}`);
    },
  });

  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.status === "1" ? c.name : `${c.name} (Inactive)` }));
  const vendorOptions = [{ value: "", label: "— None —" }, ...vendors.map((v) => ({ value: String(v.id), label: v.status === "1" ? v.name : `${v.name} (Inactive)` }))];
  const projectOptions = [{ value: "", label: "— None —" }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))];
  const filterCategoryOptions = [{ value: "", label: "All Categories" }, ...categoryOptions];
  const filterVendorOptions = [{ value: "", label: "All Vendors" }, ...vendors.map((v) => ({ value: String(v.id), label: v.name }))];

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  const handleApplyFilters = () => {
    setAppliedFilters({ from: fromDate, to: toDate, category: filterCategoryId, vendor: filterVendorId });
  };
  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setFilterCategoryId("");
    setFilterVendorId("");
    setAppliedFilters({ from: "", to: "", category: "", vendor: "" });
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("finance_category_id", categoryId);
    if (vendorId) fd.append("vendor_id", vendorId);
    if (projectId) fd.append("project_id", projectId);
    fd.append("amount", amount);
    fd.append("date_received", dateReceived);
    fd.append("is_recurring", isRecurring);
    if (description) fd.append("description", description);
    if (receiptFile) fd.append("receipt", receiptFile);
    return fd;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/revenues", { method: "POST", body: buildFormData() });
    },
    onSuccess: () => {
      toast.success("Revenue recorded successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to record revenue.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const fd = buildFormData();
      fd.append("_method", "PUT");
      return apiRequest(`/revenues/${selectedId}`, { method: "POST", body: fd });
    },
    onSuccess: () => {
      toast.success("Revenue updated successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update revenue.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/revenues/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Revenue deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete revenue.");
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this revenue record?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (r: any) => {
    setSelectedId(String(r.id));
    setCategoryId(String(r.finance_category_id));
    setVendorId(r.vendor_id ? String(r.vendor_id) : "");
    setProjectId(r.project_id ? String(r.project_id) : "");
    setAmount(String(r.amount));
    setDateReceived(r.date_received);
    setIsRecurring(r.is_recurring ? "1" : "0");
    setDescription(r.description || "");
    setReceiptFile(null);
    setExistingReceiptUrl(r.receipt_url || null);
  };

  const handleClear = () => {
    setSelectedId(null);
    setCategoryId("");
    setVendorId("");
    setProjectId("");
    setAmount("");
    setDateReceived("");
    setIsRecurring("0");
    setDescription("");
    setReceiptFile(null);
    setExistingReceiptUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const totalPages = Math.ceil(revenues.length / itemsPerPage);
  const paginatedRevenues = revenues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalAmount = revenues.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);

  const periodLabel = `Period: ${appliedFilters.from || "All"} to ${appliedFilters.to || "All"}`;

  const handleExportPdf = () => {
    exportReportPdf({
      filenamePrefix: "Revenue_Report",
      reportTitle: "Revenue Report",
      periodLabel,
      user,
      summary: [
        { label: "Total Records", value: String(revenues.length) },
        { label: "Total Amount", value: `BDT ${formatMoney(totalAmount)}` },
      ],
      columns: [
        { header: "Date", width: 20, render: (r) => r.date_received || "N/A" },
        { header: "Category", width: 34, render: (r) => (r.category?.name || "N/A").substring(0, 20) },
        { header: "Vendor", width: 34, render: (r) => (r.vendor?.name || "").substring(0, 20) },
        { header: "Project", width: 34, render: (r) => (r.project?.name || "").substring(0, 20) },
        { header: "Recurring", width: 20, render: (r) => (r.is_recurring ? "Yes" : "No") },
        { header: "Amount (BDT)", width: 40, align: "right", render: (r) => formatMoney(r.amount) },
      ],
      rows: revenues,
      totalsRow: ["TOTAL", null, null, null, null, formatMoney(totalAmount)],
    });
  };

  const handleExportCsv = () => {
    exportReportCsv(
      [
        { header: "Date Received", render: (r) => r.date_received || "N/A" },
        { header: "Category", render: (r) => r.category?.name || "N/A" },
        { header: "Vendor", render: (r) => r.vendor?.name || "N/A" },
        { header: "Project", render: (r) => r.project?.name || "N/A" },
        { header: "Amount (BDT)", render: (r) => formatMoney(r.amount) },
        { header: "Recurring", render: (r) => (r.is_recurring ? "Yes" : "No") },
        { header: "Description", render: (r) => r.description || "" },
        { header: "Created By", render: (r) => r.creator?.name || "N/A" },
      ],
      revenues,
      "Revenue_Report",
      ["TOTAL", "", "", "", formatMoney(totalAmount), "", "", ""],
    );
  };

  return (
    <DashboardShell title="Revenue" subtitle="Record and track business income by category, vendor, and project.">
      <div className={`grid min-w-0 grid-cols-1 gap-6 ${showForm ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {showForm && (
          <div className="card-surface min-w-0 p-5 h-fit space-y-4">
            <h3 className="font-display text-base font-semibold">
              {selectedId ? "Edit Revenue" : "Add Revenue"}
            </h3>
            <div className="dark-fields-panel space-y-3 rounded-xl border border-black/20 bg-[#5c5c5c] p-4">
              <div>
                <Label>Revenue Category *</Label>
                <Combobox
                  value={categoryId}
                  onChange={setCategoryId}
                  options={categoryOptions}
                  placeholder="Select category"
                  searchPlaceholder="Search categories..."
                  emptyText="No categories found. Add one in Finance Categories."
                />
              </div>
              <div>
                <Label>Vendor / Payer</Label>
                <Combobox
                  value={vendorId}
                  onChange={setVendorId}
                  options={vendorOptions}
                  placeholder="Select vendor (optional)"
                  searchPlaceholder="Search vendors..."
                  emptyText="No vendors found."
                />
              </div>
              <div>
                <Label>Project</Label>
                <Combobox
                  value={projectId}
                  onChange={setProjectId}
                  options={projectOptions}
                  placeholder="Select project (optional)"
                  searchPlaceholder="Search projects..."
                  emptyText="No projects found."
                />
                <p className="mt-1 text-xs text-white/60">
                  Link this income to a project to keep its records together.
                </p>
              </div>
              <div>
                <Label>Revenue Amount (৳) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Date Received *</Label>
                <DatePicker value={dateReceived} onChange={setDateReceived} />
              </div>
              <div>
                <Label>Recurring Revenue?</Label>
                <Select value={isRecurring} onValueChange={setIsRecurring}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No, One-time Income</SelectItem>
                    <SelectItem value="1">Yes, Recurring Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Purpose &amp; Description</Label>
                <Textarea
                  rows={3}
                  placeholder="What is this income for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <Label>Attach Receipt (PDF/Image)</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
                {existingReceiptUrl && !receiptFile && (
                  <a
                    href={existingReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Paperclip className="h-3 w-3" /> View current receipt
                  </a>
                )}
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              {!selectedId ? (
                <Button
                  className="gradient-primary flex-1"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !categoryId || !amount || !dateReceived}
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
                    disabled={updateMutation.isPending || !categoryId || !amount || !dateReceived}
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
        )}

        <div className="min-w-0 space-y-4">
          <div className="card-surface flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full sm:w-[150px]">
              <Label className="text-xs">From</Label>
              <DatePicker value={fromDate} onChange={setFromDate} />
            </div>
            <div className="w-full sm:w-[150px]">
              <Label className="text-xs">To</Label>
              <DatePicker value={toDate} onChange={setToDate} />
            </div>
            <div className="w-full sm:w-[200px]">
              <Label className="text-xs">Category</Label>
              <Combobox value={filterCategoryId} onChange={setFilterCategoryId} options={filterCategoryOptions} placeholder="All Categories" />
            </div>
            <div className="w-full sm:w-[200px]">
              <Label className="text-xs">Vendor</Label>
              <Combobox value={filterVendorId} onChange={setFilterVendorId} options={filterVendorOptions} placeholder="All Vendors" />
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
                  <h3 className="font-display text-base font-semibold">All Revenue</h3>
                  <p className="text-xs text-muted-foreground">{revenues.length} records</p>
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
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-mono font-semibold text-emerald-600">৳{totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-slate-50/50">
                      <th className="px-5 py-3 font-medium w-12">SL</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 font-medium">Vendor</th>
                      <th className="px-5 py-3 font-medium">Project</th>
                      <th className="px-5 py-3 text-right font-medium">Amount (৳)</th>
                      <th className="px-5 py-3 font-medium">Recurring</th>
                      <th className="px-5 py-3 font-medium">Receipt</th>
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
                    ) : paginatedRevenues.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-6 text-center text-muted-foreground">
                          No revenue records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedRevenues.map((r, i) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                        return (
                          <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                            <td className="px-5 py-3 font-mono text-xs text-slate-500">{globalIndex}</td>
                            <td className="px-5 py-3 text-slate-600 font-mono text-xs">{r.date_received}</td>
                            <td className="px-5 py-3 font-medium text-slate-800">{r.category?.name || "—"}</td>
                            <td className="px-5 py-3 text-slate-600">{r.vendor?.name || "—"}</td>
                            <td className="px-5 py-3 text-slate-600">{r.project?.name || "—"}</td>
                            <td className="px-5 py-3 text-right font-mono font-semibold text-emerald-600">
                              {(Number(r.amount) || 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-3">
                              {r.is_recurring ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-primary/10 text-primary border-primary/30">
                                  RECURRING
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">One-time</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {r.receipt_url ? (
                                <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs inline-flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" /> View
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                {canManageFinance && (
                                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => handleSelectForEdit(r)}>
                                    <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                  </Button>
                                )}
                                {canManageFinance && (
                                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5" onClick={() => handleDelete(String(r.id))} disabled={deleteMutation.isPending}>
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

            {revenues.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, revenues.length)} to {Math.min(currentPage * itemsPerPage, revenues.length)} of {revenues.length} entries
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
