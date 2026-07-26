import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Save, RefreshCw, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";

export const Route = createFileRoute("/roles")({ component: RolesPage });

const PERMISSION_GROUPS = [
  {
    category: "System Access",
    permissions: [
      { id: "view_dashboard", label: "View Dashboard" },
      { id: "manage_settings", label: "Manage Site Settings" },
      { id: "view_reports", label: "View Admin Reports" },
    ]
  },
  {
    category: "Patients Database",
    permissions: [
      { id: "view_database", label: "View Patient List" },
      { id: "add_patient", label: "Add Patient" },
      { id: "edit_patient", label: "Edit Patient" },
      { id: "delete_patient", label: "Delete Patient" },
      { id: "print_patient_card", label: "Print Patient Card" },
      { id: "edit_payment", label: "Edit Payment" },
    ]
  },
  {
    category: "Medical Reports",
    permissions: [
      { id: "edit_report", label: "Edit Reports" },
      { id: "print_report", label: "Print Reports" },
      { id: "upload_xray", label: "Upload X-Ray" },
    ]
  },
  {
    category: "Agency Management",
    permissions: [
      { id: "view_agency_list", label: "View Agency List" },
      { id: "add_agency", label: "Add Agency" },
      { id: "edit_agency", label: "Edit Agency" },
      { id: "delete_agency", label: "Delete Agency" },
      { id: "view_agency_balance", label: "View Balance" },
      { id: "add_payment", label: "Receive Payment" },
    ]
  },
  {
    category: "MR Management",
    permissions: [
      { id: "view_mr_list", label: "View MR List" },
      { id: "add_mr", label: "Add MR" },
      { id: "edit_mr", label: "Edit MR" },
      { id: "delete_mr", label: "Delete MR" },
    ]
  },
  {
    category: "Country Management",
    permissions: [
      { id: "view_country_list", label: "View Country List" },
      { id: "add_country", label: "Add Country" },
      { id: "edit_country", label: "Edit Country" },
      { id: "delete_country", label: "Delete Country" },
    ]
  },
  {
    category: "User & Role Management",
    permissions: [
      { id: "manage_users", label: "Manage Users" },
      { id: "manage_roles", label: "Manage Roles" },
    ]
  }
];

function RolesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  
  // Load Roles
  const { data: roles = [], isLoading } = useQuery<any[]>({
    queryKey: ["roles"],
    queryFn: () => apiRequest("/roles"),
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canManageRoles = currentUser?.role === 'Admin' || currentUser?.role_name === 'Superadmin' || (currentUser?.permissions || []).includes('manage_roles');

  const handlePermissionToggle = (permId: string) => {
    setPermissions((prev) => 
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  // Save Role Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/roles", {
        method: "POST",
        body: JSON.stringify({ name, permissions }),
      });
    },
    onSuccess: () => {
      toast.success("Role created successfully!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to create role.");
    },
  });

  // Update Role Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      return apiRequest(`/roles/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ name, permissions }),
      });
    },
    onSuccess: () => {
      toast.success("Role updated successfully!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      // Invalidate users to refresh permissions if any current user has this role
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update role.");
    },
  });

  // Delete Role Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/roles/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Role deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete role.");
    },
  });

  const handleSelectForEdit = (role: any) => {
    setSelectedId(String(role.id));
    setName(role.name || "");
    setPermissions(role.permissions || []);
  };

  const resetForm = () => {
    setSelectedId(null);
    setName("");
    setPermissions([]);
  };

  const handleDelete = (id: string, roleName: string) => {
    if (confirm(`Are you sure you want to delete the role "${roleName}"? Users with this role will lose their custom permissions.`)) {
      deleteMutation.mutate(id);
    }
  };

  if (currentUser && !canManageRoles) {
    return (
      <DashboardShell title="Roles & Permissions" subtitle="Manage dynamic access control levels for users.">
        <div className="card-surface p-8 text-center text-red-500 font-semibold">
          Unauthorized Access
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Roles & Permissions" subtitle="Manage dynamic access control levels for users.">
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">

        {/* Form Panel */}
        <div className="card-surface min-w-0 p-5 space-y-4 h-fit">
          <h3 className="font-display text-base font-semibold flex items-center gap-1.5">
            {selectedId ? <RefreshCw className="h-4.5 w-4.5 text-primary animate-spin-once" /> : <ShieldCheck className="h-4.5 w-4.5 text-primary" />}
            {selectedId ? "Edit Role" : "Create New Role"}
          </h3>
          
          <div className="space-y-4">
            <div>
              <Label>Role Name</Label>
              <Input
                placeholder="e.g. Accountant, Front Desk"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={name === "Superadmin"}
              />
              {name === "Superadmin" && (
                <p className="text-xs text-muted-foreground mt-1">Superadmin role name cannot be changed.</p>
              )}
            </div>
            
            <div className="space-y-3 border-t border-border/60 pt-4">
              <Label>Permissions</Label>
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.category} className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.category}</h4>
                    <div className="space-y-2 ml-1">
                      {group.permissions.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={perm.id} 
                            checked={name === "Superadmin" || permissions.includes(perm.id)}
                            onCheckedChange={() => handlePermissionToggle(perm.id)}
                            disabled={name === "Superadmin"} // Superadmin always has all permissions conceptually
                          />
                          <label
                            htmlFor={perm.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {perm.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {!selectedId ? (
              <Button
                className="gradient-primary flex-1"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !name || permissions.length === 0}
              >
                {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Create Role
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1 border-primary/40 hover:bg-primary/5 text-primary"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending || !name || name === "Superadmin"}
                >
                  {updateMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                  Update
                </Button>
                <Button variant="ghost" className="flex-1" onClick={resetForm}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* List Table */}
        <div className="card-surface min-w-0">
          <div className="flex items-center justify-between border-b border-border/60 p-5">
            <div>
              <h3 className="font-display text-base font-semibold">Available Roles</h3>
              <p className="text-xs text-muted-foreground">Assign these roles to users to grant specific access</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Role Name</th>
                  <th className="px-5 py-3 font-medium">Permissions</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Loading roles...
                      </div>
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-muted-foreground">
                      No roles found.
                    </td>
                  </tr>
                ) : (
                  roles.map((r) => (
                    <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium whitespace-nowrap text-primary">{r.name}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {r.name === "Superadmin" ? (
                             PERMISSION_GROUPS.flatMap(g => g.permissions).map((p: any) => (
                              <span key={p.id} className="inline-block bg-muted px-2 py-0.5 rounded text-[10px] text-muted-foreground border border-border/50">
                                {p.id}
                              </span>
                            ))
                          ) : r.permissions && r.permissions.length > 0 ? (
                            r.permissions.map((p: string) => (
                              <span key={p} className="inline-block bg-muted px-2 py-0.5 rounded text-[10px] text-muted-foreground border border-border/50">
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No permissions</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right flex justify-end gap-1.5 h-full items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary-glow"
                          onClick={() => handleSelectForEdit(r)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!["Superadmin", "Receive", "Read-only"].includes(r.name) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/5"
                            onClick={() => handleDelete(String(r.id), r.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
