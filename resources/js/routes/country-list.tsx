import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Save, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/country-list")({
  component: CountryListPage,
});

function CountryListPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Load countries
  const { data: countries = [], isLoading } = useQuery<any[]>({
    queryKey: ["countries"],
    queryFn: () => apiRequest("/countries"),
  });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canAddCountry = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('add_country');
  const canEditCountry = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('edit_country');
  const canDeleteCountry = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('delete_country');
  const showForm = canAddCountry || (canEditCountry && selectedId);

  // Reset pagination page to 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery]);

  // Save new country mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/countries", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      toast.success("Country saved successfully.");
      setName("");
      queryClient.invalidateQueries({ queryKey: ["countries"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save country.");
    },
  });

  // Update existing country mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/countries/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      toast.success("Country updated successfully.");
      setName("");
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["countries"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update country.");
    },
  });

  // Delete Country Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/countries/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Country deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["countries"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete country.");
    },
  });

  const handleDelete = (id: string, countryName: string) => {
    if (confirm(`Are you sure you want to delete country "${countryName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (country: any) => {
    setSelectedId(String(country.id));
    setName(country.name);
  };

  const handleClear = () => {
    setSelectedId(null);
    setName("");
  };

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  // Paginated Slicing
  const totalPages = Math.ceil(filteredCountries.length / itemsPerPage);
  const paginatedCountries = filteredCountries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardShell title="Country List" subtitle="Manage available countries for medical reports and entry forms.">
      <div className={`grid gap-6 ${showForm ? 'lg:grid-cols-[380px_1fr]' : 'lg:grid-cols-1'}`}>
        
        {/* Form Panel */}
        {showForm && (
        <div className="card-surface p-5 h-fit">
          <h3 className="font-display text-base font-semibold">
            {selectedId ? "Edit Country" : "Add Country"}
          </h3>
          <div className="mt-4 space-y-3">
            <div>
              <Label>ID</Label>
              <Input placeholder={selectedId || "Auto"} disabled />
            </div>
            <div>
              <Label>Country Name</Label>
              <Input
                placeholder="e.g. Malaysia"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
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
        <div className="card-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 p-5">
              <div>
                <h3 className="font-display text-base font-semibold">All countries</h3>
                <p className="text-xs text-muted-foreground">{filteredCountries.length} destinations</p>
              </div>
              <Input
                placeholder="Filter…"
                className="w-52"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">SL</th>
                    <th className="px-5 py-3 font-medium">Country Name</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Loading list...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedCountries.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-muted-foreground">
                        No countries found.
                      </td>
                    </tr>
                  ) : (
                    paginatedCountries.map((c, i) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                      return (
                        <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                          <td className="px-5 py-3 font-mono text-xs">{globalIndex}</td>
                          <td className="px-5 py-3 font-medium">{c.name}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {canEditCountry && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  onClick={() => handleSelectForEdit(c)}
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                </Button>
                              )}
                              {canDeleteCountry && (
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

          {/* Pagination Controls */}
          {filteredCountries.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/60 p-4 bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredCountries.length)} to {Math.min(currentPage * itemsPerPage, filteredCountries.length)} of {filteredCountries.length} entries
              </span>
              <div className="flex gap-1">
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
