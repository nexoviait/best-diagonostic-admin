import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Save, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";

export const Route = createFileRoute("/finance-categories")({
  component: FinanceCategoriesPage,
});

function FinanceCategoriesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [status, setStatus] = useState("1");
  const [filterQuery, setFilterQuery] = useState("");
  const [typeTab, setTypeTab] = useState<"all" | "expense" | "revenue">("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { data: categories = [], isLoading } = useQuery<any[]>({
    queryKey: ["finance-categories"],
    queryFn: () => apiRequest("/finance-categories"),
  });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canManageFinance = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('manage_finance');
  const showForm = canManageFinance;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery, typeTab]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/finance-categories", {
        method: "POST",
        body: JSON.stringify({ name, type, status }),
      });
    },
    onSuccess: () => {
      toast.success("Category added successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to add category.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      return apiRequest(`/finance-categories/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ name, type, status }),
      });
    },
    onSuccess: () => {
      toast.success("Category updated successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update category.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/finance-categories/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Category deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete category.");
    },
  });

  const handleDelete = (id: string, categoryName: string) => {
    if (confirm(`Are you sure you want to delete category "${categoryName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (category: any) => {
    setSelectedId(String(category.id));
    setName(category.name);
    setType(category.type);
    setStatus(category.status || "1");
  };

  const handleClear = () => {
    setSelectedId(null);
    setName("");
    setType("expense");
    setStatus("1");
  };

  const filteredCategories = categories.filter((c) => {
    const matchesTab = typeTab === "all" || c.type === typeTab;
    const matchesQuery = c.name.toLowerCase().includes(filterQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardShell title="Finance Categories" subtitle="Manage the expense and revenue categories used across the Finance module.">
      <div className={`grid min-w-0 grid-cols-1 gap-6 ${showForm ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {showForm && (
          <div className="card-surface min-w-0 p-5 h-fit space-y-4">
            <h3 className="font-display text-base font-semibold">
              {selectedId ? "Edit Category" : "Add New Category"}
            </h3>
            <div className="dark-fields-panel space-y-3 rounded-xl border border-black/20 bg-[#5c5c5c] p-4">
              <div>
                <Label>Category Name</Label>
                <Input
                  placeholder="e.g. Office Rent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              {!selectedId ? (
                <Button
                  className="gradient-primary flex-1"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !name}
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
                    disabled={updateMutation.isPending || !name}
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

        <div className="card-surface min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">All Categories</h3>
                <p className="text-xs text-muted-foreground">{filteredCategories.length} categories</p>
              </div>
              <div className="flex gap-2">
                <div className="flex rounded-lg border border-border/60 p-0.5">
                  {(["all", "expense", "revenue"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeTab(t)}
                      className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                        typeTab === t ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Filter by name..."
                  className="w-full sm:w-52"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-slate-50/50">
                    <th className="px-5 py-3 font-medium w-12">SL</th>
                    <th className="px-5 py-3 font-medium">Category Name</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Loading list...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    paginatedCategories.map((c, i) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                      return (
                        <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500">{globalIndex}</td>
                          <td className="px-5 py-3 font-semibold text-slate-800">{c.name}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border capitalize ${
                              c.type === "expense"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {c.type}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              c.status === "1"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {c.status === "1" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {canManageFinance && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  onClick={() => handleSelectForEdit(c)}
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                </Button>
                              )}
                              {canManageFinance && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/5"
                                  onClick={() => handleDelete(String(c.id), c.name)}
                                  disabled={deleteMutation.isPending}
                                >
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

          {filteredCategories.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredCategories.length)} to {Math.min(currentPage * itemsPerPage, filteredCategories.length)} of {filteredCategories.length} entries
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
      </div>
    </DashboardShell>
  );
}
