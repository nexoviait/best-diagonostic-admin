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

export const Route = createFileRoute("/mr-list")({ component: MrListPage });

function MrListPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [role, setRole] = useState("MR");
  const [status, setStatus] = useState("1");
  const [filterQuery, setFilterQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Load MR representatives
  const { data: mrs = [], isLoading } = useQuery<any[]>({
    queryKey: ["mrs"],
    queryFn: () => apiRequest("/mrs"),
  });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canAddMr = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('add_mr');
  const canEditMr = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('edit_mr');
  const canDeleteMr = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('delete_mr');
  const showForm = canAddMr || (canEditMr && selectedId);

  // Reset page to 1 when filterQuery changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery]);

  // Save MR Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/mrs", {
        method: "POST",
        body: JSON.stringify({ name, role, email, mobile_no: mobileNo, status }),
      });
    },
    onSuccess: () => {
      toast.success("Medical Representative saved successfully.");
      setName("");
      setEmail("");
      setMobileNo("");
      setRole("MR");
      setStatus("1");
      queryClient.invalidateQueries({ queryKey: ["mrs"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save MR.");
    },
  });

  // Update MR Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      return apiRequest(`/mrs/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ name, role, email, mobile_no: mobileNo, status }),
      });
    },
    onSuccess: () => {
      toast.success("Medical Representative updated successfully.");
      setName("");
      setEmail("");
      setMobileNo("");
      setRole("MR");
      setStatus("1");
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["mrs"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update MR.");
    },
  });

  // Delete MR Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/mrs/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Medical Representative deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["mrs"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete MR.");
    },
  });

  const handleDelete = (id: string, mrName: string) => {
    if (confirm(`Are you sure you want to delete "${mrName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (mr: any) => {
    setSelectedId(String(mr.id));
    setName(mr.name);
    setEmail(mr.email || "");
    setMobileNo(mr.mobile_no || "");
    setRole(mr.role || "MR");
    setStatus(mr.status || "1");
  };

  const handleClear = () => {
    setSelectedId(null);
    setName("");
    setEmail("");
    setMobileNo("");
    setRole("MR");
    setStatus("1");
  };

  const filteredMrs = mrs.filter((m) =>
    m.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (m.email && m.email.toLowerCase().includes(filterQuery.toLowerCase())) ||
    (m.mobile_no && m.mobile_no.includes(filterQuery))
  );

  // Paginated Slicing
  const totalPages = Math.ceil(filteredMrs.length / itemsPerPage);
  const paginatedMrs = filteredMrs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardShell title="Medical Representatives" subtitle="Manage MR profiles and commissions directory.">
      <div className={`grid min-w-0 grid-cols-1 gap-6 ${showForm ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {/* Form panel */}
        {showForm && (
        <div className="card-surface min-w-0 p-5 h-fit space-y-4">
          <h3 className="font-display text-base font-semibold">
            {selectedId ? "Edit MR Profile" : "Add New MR"}
          </h3>
          <div className="space-y-3">
            <div>
              <Label>ID</Label>
              <Input placeholder={selectedId || "Auto"} disabled className="bg-slate-50" />
            </div>
            <div>
              <Label>MR Name</Label>
              <Input
                placeholder="Enter representative name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Mobile Number</Label>
              <Input
                placeholder="Enter mobile number"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
              />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Input
                placeholder="e.g. MR or Senior MR"
                value={role}
                onChange={(e) => setRole(e.target.value)}
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

        {/* List Table */}
        <div className="card-surface min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Medical Representatives</h3>
                <p className="text-xs text-muted-foreground">{filteredMrs.length} members</p>
              </div>
              <Input
                placeholder="Filter by name, mobile, email…"
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
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Mobile No</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Role</th>
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
                  ) : paginatedMrs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                        No representatives found.
                      </td>
                    </tr>
                  ) : (
                    paginatedMrs.map((m, i) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                      return (
                        <tr key={m.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500">{globalIndex}</td>
                          <td className="px-5 py-3 font-semibold text-slate-800">{m.name}</td>
                          <td className="px-5 py-3 text-slate-600 font-mono text-xs">{m.mobile_no || "N/A"}</td>
                          <td className="px-5 py-3 text-slate-600 text-xs">{m.email || "N/A"}</td>
                          <td className="px-5 py-3 text-muted-foreground">{m.role}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              m.status === "1"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {m.status === "1" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {canEditMr && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary-glow"
                                  onClick={() => handleSelectForEdit(m)}
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                </Button>
                              )}
                              {canDeleteMr && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/5"
                                  onClick={() => handleDelete(String(m.id), m.name)}
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

          {/* Pagination Controls */}
          {filteredMrs.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredMrs.length)} to {Math.min(currentPage * itemsPerPage, filteredMrs.length)} of {filteredMrs.length} entries
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
      </div>
    </DashboardShell>
  );
}
