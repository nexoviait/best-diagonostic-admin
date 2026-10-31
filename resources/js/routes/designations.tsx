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

export const Route = createFileRoute("/designations")({
  component: DesignationsPage,
});

function DesignationsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("1");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { data: designations = [], isLoading } = useQuery<any[]>({
    queryKey: ["designations"],
    queryFn: () => apiRequest("/designations"),
  });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canManageEmployees = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('manage_employees');
  const showForm = canManageEmployees;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/designations", {
        method: "POST",
        body: JSON.stringify({ name, status }),
      });
    },
    onSuccess: () => {
      toast.success("Designation added successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["designations"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to add designation.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/designations/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ name, status }),
      });
    },
    onSuccess: () => {
      toast.success("Designation updated successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["designations"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update designation.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/designations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Designation deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["designations"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete designation.");
    },
  });

  const handleDelete = (id: string, designationName: string) => {
    if (confirm(`Are you sure you want to delete designation "${designationName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (d: any) => {
    setSelectedId(String(d.id));
    setName(d.name);
    setStatus(d.status || "1");
  };

  const handleClear = () => {
    setSelectedId(null);
    setName("");
    setStatus("1");
  };

  const filteredDesignations = designations.filter((d) =>
    d.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDesignations.length / itemsPerPage);
  const paginatedDesignations = filteredDesignations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardShell title="Designations" subtitle="Manage the designations employees can be assigned to.">
      <div className={`grid min-w-0 grid-cols-1 gap-6 ${showForm ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {showForm && (
          <div className="card-surface min-w-0 p-5 h-fit space-y-4">
            <h3 className="font-display text-base font-semibold">
              {selectedId ? "Edit Designation" : "Add Designation"}
            </h3>
            <div className="dark-fields-panel space-y-3 rounded-xl border border-black/20 bg-[#5c5c5c] p-4">
              <div>
                <Label>Designation Name</Label>
                <Input
                  placeholder="e.g. Senior Technician"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
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
                <h3 className="font-display text-base font-semibold">All Designations</h3>
                <p className="text-xs text-muted-foreground">{filteredDesignations.length} designations</p>
              </div>
              <Input
                placeholder="Filter by name..."
                className="w-full sm:w-52"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-slate-50/50">
                    <th className="px-5 py-3 font-medium w-12">SL</th>
                    <th className="px-5 py-3 font-medium">Designation Name</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Loading list...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedDesignations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">
                        No designations found.
                      </td>
                    </tr>
                  ) : (
                    paginatedDesignations.map((d, i) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                      return (
                        <tr key={d.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500">{globalIndex}</td>
                          <td className="px-5 py-3 font-semibold text-slate-800">{d.name}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              d.status === "1"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {d.status === "1" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {canManageEmployees && (
                                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => handleSelectForEdit(d)}>
                                  <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                </Button>
                              )}
                              {canManageEmployees && (
                                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5" onClick={() => handleDelete(String(d.id), d.name)} disabled={deleteMutation.isPending}>
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

          {filteredDesignations.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredDesignations.length)} to {Math.min(currentPage * itemsPerPage, filteredDesignations.length)} of {filteredDesignations.length} entries
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
    </DashboardShell>
  );
}
