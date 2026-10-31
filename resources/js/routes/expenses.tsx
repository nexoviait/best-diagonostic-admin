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

export const Route = createFileRoute("/expenses")({ component: ExpensesPage });

function ExpensesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [dateIncurred, setDateIncurred] = useState("");
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
    queryKey: ["finance-categories", "expense"],
    queryFn: () => apiRequest("/finance-categories?type=expense"),
  });
  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ["vendors"],
    queryFn: () => apiRequest("/vendors"),
  });
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => apiRequest("/projects"),
  });

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ["expenses", appliedFilters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (appliedFilters.from) params.append("from_date", appliedFilters.from);
      if (appliedFilters.to) params.append("to_date", appliedFilters.to);
      if (appliedFilters.category) params.append("finance_category_id", appliedFilters.category);
      if (appliedFilters.vendor) params.append("vendor_id", appliedFilters.vendor);
      return apiRequest(`/expenses?${params.toString()}`);
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
    fd.append("date_incurred", dateIncurred);
    fd.append("is_recurring", isRecurring);
    if (description) fd.append("description", description);
    if (receiptFile) fd.append("receipt", receiptFile);
    return fd;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/expenses", { method: "POST", body: buildFormData() });
    },
    onSuccess: () => {
      toast.success("Expense recorded successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to record expense.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const fd = buildFormData();
      fd.append("_method", "PUT");
      return apiRequest(`/expenses/${selectedId}`, { method: "POST", body: fd });
    },
    onSuccess: () => {
      toast.success("Expense updated successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update expense.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/expenses/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Expense deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete expense.");
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (e: any) => {
    setSelectedId(String(e.id));
    setCategoryId(String(e.finance_category_id));
    setVendorId(e.vendor_id ? String(e.vendor_id) : "");
    setProjectId(e.project_id ? String(e.project_id) : "");
    setAmount(String(e.amount));
    setDateIncurred(e.date_incurred);
    setIsRecurring(e.is_recurring ? "1" : "0");
    setDescription(e.description || "");
    setReceiptFile(null);
    setExistingReceiptUrl(e.receipt_url || null);
  };

  const handleClear = () => {
    setSelectedId(null);
    setCategoryId("");
    setVendorId("");
    setProjectId("");
    setAmount("");
    setDateIncurred("");
    setIsRecurring("0");
    setDescription("");
    setReceiptFile(null);
    setExistingReceiptUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const paginatedExpenses = expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalAmount = expenses.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);

  const periodLabel = `Period: ${appliedFilters.from || "All"} to ${appliedFilters.to || "All"}`;

  const handleExportPdf = () => {
    exportReportPdf({
      filenamePrefix: "Expense_Report",
      reportTitle: "Expense Report",
      periodLabel,
      user,
      summary: [
        { label: "Total Records", value: String(expenses.length) },
        { label: "Total Amount", value: `BDT ${formatMoney(totalAmount)}` },
      ],
      columns: [
        { header: "Date", width: 20, render: (e) => e.date_incurred || "N/A" },
        { header: "Category", width: 34, render: (e) => (e.category?.name || "N/A").substring(0, 20) },
        { header: "Vendor", width: 34, render: (e) => (e.vendor?.name || "").substring(0, 20) },
        { header: "Project", width: 34, render: (e) => (e.project?.name || "").substring(0, 20) },
        { header: "Recurring", width: 20, render: (e) => (e.is_recurring ? "Yes" : "No") },
        { header: "Amount (BDT)", width: 40, align: "right", render: (e) => formatMoney(e.amount) },
      ],
      rows: expenses,
      totalsRow: ["TOTAL", null, null, null, null, formatMoney(totalAmount)],
    });
  };

  const handleExportCsv = () => {
    exportReportCsv(
      [
        { header: "Date Incurred", render: (e) => e.date_incurred || "N/A" },
        { header: "Category", render: (e) => e.category?.name || "N/A" },
        { header: "Vendor", render: (e) => e.vendor?.name || "N/A" },
        { header: "Project", render: (e) => e.project?.name || "N/A" },
        { header: "Amount (BDT)", render: (e) => formatMoney(e.amount) },
        { header: "Recurring", render: (e) => (e.is_recurring ? "Yes" : "No") },
        { header: "Description", render: (e) => e.description || "" },
        { header: "Created By", render: (e) => e.creator?.name || "N/A" },
      ],
      expenses,
      "Expense_Report",
      ["TOTAL", "", "", "", formatMoney(totalAmount), "", "", ""],
    );
  };

  return (
    <DashboardShell title="Expenses" subtitle="Record and track business expenses by category, vendor, and project.">
      <div className={`grid min-w-0 grid-cols-1 gap-6 ${showForm ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {showForm && (
          <div className="card-surface min-w-0 p-5 h-fit space-y-4">
            <h3 className="font-display text-base font-semibold">
              {selectedId ? "Edit Expense" : "Add Expense"}
            </h3>
            <div className="dark-fields-panel space-y-3 rounded-xl border border-black/20 bg-[#5c5c5c] p-4">
              <div>
                <Label>Expense Category *</Label>
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
                <Label>Vendor</Label>
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
                  Link this claim to a project to count it toward that project's Actual Spent.
                </p>
              </div>
              <div>
                <Label>Expense Amount (৳) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Date Incurred *</Label>
                <DatePicker value={dateIncurred} onChange={setDateIncurred} />
              </div>
              <div>
                <Label>Recurring Expense?</Label>
                <Select value={isRecurring} onValueChange={setIsRecurring}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No, One-time Charge</SelectItem>
                    <SelectItem value="1">Yes, Recurring Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Purpose &amp; Description</Label>
                <Textarea
                  rows={3}
                  placeholder="What is this expense for?"
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
                  disabled={saveMutation.isPending || !categoryId || !amount || !dateIncurred}
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
                    disabled={updateMutation.isPending || !categoryId || !amount || !dateIncurred}
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
                  <h3 className="font-display text-base font-semibold">All Expenses</h3>
                  <p className="text-xs text-muted-foreground">{expenses.length} records</p>
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
                    <p className="font-mono font-semibold text-rose-600">৳{totalAmount.toLocaleString()}</p>
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
                    ) : paginatedExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-6 text-center text-muted-foreground">
                          No expenses found.
                        </td>
                      </tr>
                    ) : (
                      paginatedExpenses.map((e, i) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                        return (
                          <tr key={e.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                            <td className="px-5 py-3 font-mono text-xs text-slate-500">{globalIndex}</td>
                            <td className="px-5 py-3 text-slate-600 font-mono text-xs">{e.date_incurred}</td>
                            <td className="px-5 py-3 font-medium text-slate-800">{e.category?.name || "—"}</td>
                            <td className="px-5 py-3 text-slate-600">{e.vendor?.name || "—"}</td>
                            <td className="px-5 py-3 text-slate-600">{e.project?.name || "—"}</td>
                            <td className="px-5 py-3 text-right font-mono font-semibold text-rose-600">
                              {(Number(e.amount) || 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-3">
                              {e.is_recurring ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-primary/10 text-primary border-primary/30">
                                  RECURRING
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">One-time</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              {e.receipt_url ? (
                                <a href={e.receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs inline-flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" /> View
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                {canManageFinance && (
                                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => handleSelectForEdit(e)}>
                                    <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                  </Button>
                                )}
                                {canManageFinance && (
                                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5" onClick={() => handleDelete(String(e.id))} disabled={deleteMutation.isPending}>
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

            {expenses.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, expenses.length)} to {Math.min(currentPage * itemsPerPage, expenses.length)} of {expenses.length} entries
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
