import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, UserPlus, Save, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/users")({ component: UsersPage });

function UsersPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [status, setStatus] = useState("1");
  const [filterQuery, setFilterQuery] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery]);

  // Load Users
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: () => apiRequest("/users"),
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canManageUsers = currentUser?.role === 'Admin' || currentUser?.role_name === 'Superadmin' || (currentUser?.permissions || []).includes('manage_users');

  // Load Roles
  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["roles"],
    queryFn: () => apiRequest("/roles"),
  });

  // Save User Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          name,
          username,
          email,
          password,
          mobile_no: mobileNo,
          role_id: roleId,
          status,
        }),
      });
    },
    onSuccess: () => {
      toast.success("User added successfully!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add user.");
    },
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const body: Record<string, any> = {
        name,
        username,
        email,
        mobile_no: mobileNo,
        role_id: roleId,
        status,
      };
      if (password) body.password = password; // Only update password if filled

      return apiRequest(`/users/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast.success("User updated successfully!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update user.");
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/users/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("User deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete user.");
    },
  });

  const handleSelectForEdit = (user: any) => {
    setSelectedId(String(user.id));
    setName(user.name || "");
    setUsername(user.username || "");
    setEmail(user.email || "");
    setPassword(""); // Clear password field
    setMobileNo(user.mobile_no || "");
    setRoleId(String(user.role_id || ""));
    setStatus(String(user.status));
  };

  const resetForm = () => {
    setSelectedId(null);
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setMobileNo("");
    setRoleId("");
    setStatus("1");
  };

  const handleDelete = (id: string, userName: string) => {
    if (confirm(`Are you sure you want to delete user "${userName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(filterQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (currentUser && !canManageUsers) {
    return (
      <DashboardShell title="Users" subtitle="Manage system users.">
        <div className="card-surface p-8 text-center text-red-500 font-semibold">
          Unauthorized Access
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="User Management" subtitle="Create, edit, and manage application operators.">
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">

        {/* Form Panel */}
        <div className="card-surface min-w-0 p-5 space-y-4 h-fit">
          <h3 className="font-display text-base font-semibold flex items-center gap-1.5">
            {selectedId ? <RefreshCw className="h-4.5 w-4.5 text-primary animate-spin-once" /> : <UserPlus className="h-4.5 w-4.5 text-primary" />}
            {selectedId ? "Edit User Account" : "Add User Account"}
          </h3>
          
          <div className="space-y-3">
            <div>
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Username</Label>
              <Input
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="johndoe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>{selectedId ? "Password (Leave blank to keep current)" : "Password"}</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Mobile No</Label>
              <Input
                placeholder="e.g. 01700000000"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
              />
            </div>
            <div>
              <Label>Role / Permission Level</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger><SelectValue placeholder="Select a role..." /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {!selectedId ? (
              <Button
                className="gradient-primary flex-1"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !name || !username || !email || !password}
              >
                {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Create User
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1 border-primary/40 hover:bg-primary/5 text-primary"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending || !name || !username || !email}
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
              <h3 className="font-display text-base font-semibold">Registered Users</h3>
              <p className="text-xs text-muted-foreground">{filteredUsers.length} active system accounts</p>
            </div>
            <Input
              placeholder="Search users…"
              className="w-56"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Username</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Loading users...
                      </div>
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-muted-foreground">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium">{u.name}</td>
                      <td className="px-5 py-3 font-mono text-xs">{u.username}</td>
                      <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-5 py-3 text-xs uppercase font-semibold text-primary">{u.role_name}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          String(u.status) === "1" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}>
                          {String(u.status) === "1" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary-glow"
                          onClick={() => handleSelectForEdit(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/5"
                          onClick={() => handleDelete(String(u.id), u.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredUsers.length)} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
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
