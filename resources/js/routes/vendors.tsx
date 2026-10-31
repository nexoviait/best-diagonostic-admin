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

export const Route = createFileRoute("/vendors")({ component: VendorsPage });

function VendorsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("1");
  const [filterQuery, setFilterQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { data: vendors = [], isLoading } = useQuery<any[]>({
    queryKey: ["vendors"],
    queryFn: () => apiRequest("/vendors"),
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
      return apiRequest("/vendors", {
        method: "POST",
        body: JSON.stringify({ name, contact_person: contactPerson, email, mobile_no: mobileNo, address, status }),
      });
    },
    onSuccess: () => {
      toast.success("Vendor added successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to add vendor.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      return apiRequest(`/vendors/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ name, contact_person: contactPerson, email, mobile_no: mobileNo, address, status }),
      });
    },
    onSuccess: () => {
      toast.success("Vendor updated successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update vendor.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/vendors/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Vendor deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete vendor.");
    },
  });

  const handleDelete = (id: string, vendorName: string) => {
    if (confirm(`Are you sure you want to delete vendor "${vendorName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (vendor: any) => {
    setSelectedId(String(vendor.id));
    setName(vendor.name);
    setContactPerson(vendor.contact_person || "");
    setEmail(vendor.email || "");
    setMobileNo(vendor.mobile_no || "");
    setAddress(vendor.address || "");
    setStatus(vendor.status || "1");
  };

  const handleClear = () => {
    setSelectedId(null);
    setName("");
    setContactPerson("");
    setEmail("");
    setMobileNo("");
    setAddress("");
    setStatus("1");
  };

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (v.contact_person && v.contact_person.toLowerCase().includes(filterQuery.toLowerCase())) ||
    (v.email && v.email.toLowerCase().includes(filterQuery.toLowerCase())) ||
    (v.mobile_no && v.mobile_no.includes(filterQuery))
  );

  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardShell title="Vendors" subtitle="Manage the directory of vendors and suppliers used for expense tracking.">
      <div className={`grid min-w-0 grid-cols-1 gap-6 ${showForm ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {showForm && (
          <div className="card-surface min-w-0 p-5 h-fit space-y-4">
            <h3 className="font-display text-base font-semibold">
              {selectedId ? "Edit Vendor" : "Add New Vendor"}
            </h3>
            <div className="dark-fields-panel space-y-3 rounded-xl border border-black/20 bg-[#5c5c5c] p-4">
              <div>
                <Label>Vendor Name</Label>
                <Input
                  placeholder="e.g. ACME Supplies"
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
                <Label>Address</Label>
                <Input
                  placeholder="Enter vendor address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
                <h3 className="font-display text-base font-semibold">All Vendors</h3>
                <p className="text-xs text-muted-foreground">{filteredVendors.length} vendors</p>
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
                    <th className="px-5 py-3 font-medium">Vendor Name</th>
                    <th className="px-5 py-3 font-medium">Contact Person</th>
                    <th className="px-5 py-3 font-medium">Mobile No</th>
                    <th className="px-5 py-3 font-medium">Email</th>
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
                  ) : paginatedVendors.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                        No vendors found.
                      </td>
                    </tr>
                  ) : (
                    paginatedVendors.map((v, i) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                      return (
                        <tr key={v.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500">{globalIndex}</td>
                          <td className="px-5 py-3 font-semibold text-slate-800">{v.name}</td>
                          <td className="px-5 py-3 text-slate-700 font-medium">{v.contact_person || "N/A"}</td>
                          <td className="px-5 py-3 text-slate-600 font-mono text-xs">{v.mobile_no || "N/A"}</td>
                          <td className="px-5 py-3 text-slate-600 text-xs">{v.email || "N/A"}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              v.status === "1"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {v.status === "1" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {canManageFinance && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  onClick={() => handleSelectForEdit(v)}
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                </Button>
                              )}
                              {canManageFinance && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/5"
                                  onClick={() => handleDelete(String(v.id), v.name)}
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

          {filteredVendors.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredVendors.length)} to {Math.min(currentPage * itemsPerPage, filteredVendors.length)} of {filteredVendors.length} entries
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
