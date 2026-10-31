import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Save, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";

export const Route = createFileRoute("/projects")({ component: ProjectsPage });

function ProjectsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [status, setStatus] = useState("Active");
  const [filterQuery, setFilterQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => apiRequest("/projects"),
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
  }, [filterQuery]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/projects", {
        method: "POST",
        body: JSON.stringify({ name, description, budget: budget || null, status }),
      });
    },
    onSuccess: () => {
      toast.success("Project added successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to add project.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      return apiRequest(`/projects/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ name, description, budget: budget || null, status }),
      });
    },
    onSuccess: () => {
      toast.success("Project updated successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update project.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/projects/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Project deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete project.");
    },
  });

  const handleDelete = (id: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete project "${projectName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (project: any) => {
    setSelectedId(String(project.id));
    setName(project.name);
    setDescription(project.description || "");
    setBudget(project.budget != null ? String(project.budget) : "");
    setStatus(project.status || "Active");
  };

  const handleClear = () => {
    setSelectedId(null);
    setName("");
    setDescription("");
    setBudget("");
    setStatus("Active");
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const statusBadgeClass = (s: string) => {
    if (s === "Active") return "bg-green-50 text-green-700 border-green-200";
    if (s === "Completed") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-amber-50 text-amber-700 border-amber-200"; // On Hold
  };

  return (
    <DashboardShell title="Projects" subtitle="Track project budgets against actual spend from linked expenses.">
      <div className={`grid min-w-0 grid-cols-1 gap-6 ${showForm ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {showForm && (
          <div className="card-surface min-w-0 p-5 h-fit space-y-4">
            <h3 className="font-display text-base font-semibold">
              {selectedId ? "Edit Project" : "Add New Project"}
            </h3>
            <div className="dark-fields-panel space-y-3 rounded-xl border border-black/20 bg-[#5c5c5c] p-4">
              <div>
                <Label>Project Name</Label>
                <Input
                  placeholder="e.g. New Lab Equipment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <Label>Budget (৳)</Label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
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
                <h3 className="font-display text-base font-semibold">All Projects</h3>
                <p className="text-xs text-muted-foreground">{filteredProjects.length} projects</p>
              </div>
              <Input
                placeholder="Filter by name..."
                className="w-full sm:w-64"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-slate-50/50">
                    <th className="px-5 py-3 font-medium w-12">SL</th>
                    <th className="px-5 py-3 font-medium">Project Name</th>
                    <th className="px-5 py-3 text-right font-medium">Budget (৳)</th>
                    <th className="px-5 py-3 text-right font-medium">Actual Spent (৳)</th>
                    <th className="px-5 py-3 font-medium w-48">Usage</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Loading list...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    paginatedProjects.map((p, i) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                      const budgetNum = Number(p.budget) || 0;
                      const spentNum = Number(p.actual_spent) || 0;
                      const pct = budgetNum > 0 ? Math.min(100, Math.round((spentNum / budgetNum) * 100)) : 0;
                      const overBudget = budgetNum > 0 && spentNum > budgetNum;
                      return (
                        <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500">{globalIndex}</td>
                          <td className="px-5 py-3">
                            <div className="font-semibold text-slate-800">{p.name}</div>
                            {p.description && <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-slate-700">
                            {budgetNum > 0 ? budgetNum.toLocaleString() : "—"}
                          </td>
                          <td className={`px-5 py-3 text-right font-mono font-semibold ${overBudget ? "text-red-600" : "text-slate-700"}`}>
                            {spentNum.toLocaleString()}
                          </td>
                          <td className="px-5 py-3">
                            {budgetNum > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${overBudget ? "bg-red-500" : "bg-primary"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No budget set</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeClass(p.status)}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {canManageFinance && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  onClick={() => handleSelectForEdit(p)}
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                </Button>
                              )}
                              {canManageFinance && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/5"
                                  onClick={() => handleDelete(String(p.id), p.name)}
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

          {filteredProjects.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredProjects.length)} to {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length} entries
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
