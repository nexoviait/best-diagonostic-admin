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

export const Route = createFileRoute("/agency-list")({ component: AgencyListPage });

function AgencyListPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("1");
  const [filterQuery, setFilterQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Load agencies
  const { data: agencies = [], isLoading } = useQuery<any[]>({
    queryKey: ["agencies"],
    queryFn: () => apiRequest("/agencies"),
  });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canAddAgency = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('add_agency');
  const canEditAgency = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('edit_agency');
  const canDeleteAgency = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('delete_agency');
  const showForm = canAddAgency || (canEditAgency && selectedId);

  // Reset page to 1 when filterQuery changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery]);

  // Save Agency Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/agencies", {
        method: "POST",
        body: JSON.stringify({ name, price, contact_person: contactPerson, email, mobile_no: mobileNo, address, status }),
      });
    },
    onSuccess: () => {
      toast.success("Agency added successfully!");
      setName("");
      setContactPerson("");
      setEmail("");
      setMobileNo("");
      setAddress("");
      setPrice(0);
      setStatus("1");
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to add agency.");
    },
  });

  // Update Agency Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      return apiRequest(`/agencies/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ name, price, contact_person: contactPerson, email, mobile_no: mobileNo, address, status }),
      });
    },
    onSuccess: () => {
      toast.success("Agency updated successfully!");
      setName("");
      setContactPerson("");
      setEmail("");
      setMobileNo("");
      setAddress("");
      setPrice(0);
      setStatus("1");
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update agency.");
    },
  });

  // Delete Agency Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/agencies/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Agency deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete agency.");
    },
  });

  const handleDelete = (id: string, agencyName: string) => {
    if (confirm(`Are you sure you want to delete agency "${agencyName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (agency: any) => {
    setSelectedId(String(agency.id));
    setName(agency.name);
    setContactPerson(agency.contact_person || "");
    setEmail(agency.email || "");
    setMobileNo(agency.mobile_no || "");
    setAddress(agency.address || "");
    setPrice(Number(agency.price) || 0);
    setStatus(agency.status || "1");
  };

  const handleClear = () => {
    setSelectedId(null);
    setName("");
    setContactPerson("");
    setEmail("");
    setMobileNo("");
    setAddress("");
    setPrice(0);
    setStatus("1");
  };

  const filteredAgencies = agencies.filter((a) =>
    a.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (a.contact_person && a.contact_person.toLowerCase().includes(filterQuery.toLowerCase())) ||
    (a.email && a.email.toLowerCase().includes(filterQuery.toLowerCase())) ||
    (a.mobile_no && a.mobile_no.includes(filterQuery))
  );

  // Paginated Slicing
  const totalPages = Math.ceil(filteredAgencies.length / itemsPerPage);
  const paginatedAgencies = filteredAgencies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardShell title="Agency List" subtitle="Manage the directory of partner agencies and billing details.">
      <div className={`grid min-w-0 grid-cols-1 gap-6 ${showForm ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {/* Form Panel */}
        {showForm && (
        <div className="card-surface min-w-0 p-5 h-fit space-y-4">
          <h3 className="font-display text-base font-semibold">
            {selectedId ? "Edit Agency Profile" : "Add New Agency"}
          </h3>
          <div className="space-y-3">
            <div>
              <Label>Agency ID</Label>
              <Input placeholder={selectedId || "Auto"} disabled className="bg-slate-50" />
            </div>
            <div>
              <Label>Agency Name</Label>
              <Input
                placeholder="Enter agency name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input
                placeholder="Enter contact person name"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
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
              <Label>Office Address</Label>
              <Input
                placeholder="Enter agency office address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <Label>Agency Price (৳)</Label>
              <Input
                type="number"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
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
                <h3 className="font-display text-base font-semibold">All Agencies</h3>
                <p className="text-xs text-muted-foreground">{filteredAgencies.length} partners</p>
              </div>
              <Input
                placeholder="Filter by name, email, contact..."
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
                    <th className="px-5 py-3 font-medium">Agency Name</th>
                    <th className="px-5 py-3 font-medium">Contact Person</th>
                    <th className="px-5 py-3 font-medium">Mobile No</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 text-right font-medium">Agency Net (৳)</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-6 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Loading list...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedAgencies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-6 text-center text-muted-foreground">
                        No agencies found.
                      </td>
                    </tr>
                  ) : (
                    paginatedAgencies.map((a, i) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                      return (
                        <tr key={a.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500">{globalIndex}</td>
                          <td className="px-5 py-3 font-semibold text-slate-800">{a.name}</td>
                          <td className="px-5 py-3 text-slate-700 font-medium">{a.contact_person || "N/A"}</td>
                          <td className="px-5 py-3 text-slate-600 font-mono text-xs">{a.mobile_no || "N/A"}</td>
                          <td className="px-5 py-3 text-slate-600 text-xs">{a.email || "N/A"}</td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-slate-700">{(Number(a.price) || 0).toLocaleString()}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              a.status === "1"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {a.status === "1" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {canEditAgency && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  onClick={() => handleSelectForEdit(a)}
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                </Button>
                              )}
                              {canDeleteAgency && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/5"
                                  onClick={() => handleDelete(String(a.id), a.name)}
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
          {filteredAgencies.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAgencies.length)} to {Math.min(currentPage * itemsPerPage, filteredAgencies.length)} of {filteredAgencies.length} entries
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
