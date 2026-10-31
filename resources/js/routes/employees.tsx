import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Pencil, Trash2, Save, RefreshCw, Loader2, Download, FileSpreadsheet } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import { exportReportPdf, exportReportCsv, formatMoney } from "@/lib/report-export";

export const Route = createFileRoute("/employees")({ component: EmployeesPage });

function EmployeesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [address, setAddress] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [status, setStatus] = useState("1");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canManageEmployees = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('manage_employees');
  const showForm = canManageEmployees;

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["departments"],
    queryFn: () => apiRequest("/departments"),
  });
  const { data: designations = [] } = useQuery<any[]>({
    queryKey: ["designations"],
    queryFn: () => apiRequest("/designations"),
  });
  const { data: employees = [], isLoading } = useQuery<any[]>({
    queryKey: ["employees"],
    queryFn: () => apiRequest("/employees"),
  });

  const departmentOptions = [{ value: "", label: "— None —" }, ...departments.map((d) => ({ value: String(d.id), label: d.status === "1" ? d.name : `${d.name} (Inactive)` }))];
  const designationOptions = [{ value: "", label: "— None —" }, ...designations.map((d) => ({ value: String(d.id), label: d.status === "1" ? d.name : `${d.name} (Inactive)` }))];

  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery]);

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("name", name);
    if (departmentId) fd.append("department_id", departmentId);
    if (designationId) fd.append("designation_id", designationId);
    if (email) fd.append("email", email);
    if (mobileNo) fd.append("mobile_no", mobileNo);
    if (address) fd.append("address", address);
    if (joinDate) fd.append("join_date", joinDate);
    fd.append("basic_salary", basicSalary);
    if (bankName) fd.append("bank_name", bankName);
    if (bankAccountNo) fd.append("bank_account_no", bankAccountNo);
    fd.append("status", status);
    if (photoFile) fd.append("photo", photoFile);
    return fd;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/employees", { method: "POST", body: buildFormData() });
    },
    onSuccess: () => {
      toast.success("Employee added successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to add employee.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const fd = buildFormData();
      fd.append("_method", "PUT");
      return apiRequest(`/employees/${selectedId}`, { method: "POST", body: fd });
    },
    onSuccess: () => {
      toast.success("Employee updated successfully!");
      handleClear();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to update employee.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/employees/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Employee deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete employee.");
    },
  });

  const handleDelete = (id: string, employeeName: string) => {
    if (confirm(`Are you sure you want to delete employee "${employeeName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelectForEdit = (e: any) => {
    setSelectedId(String(e.id));
    setName(e.name);
    setDepartmentId(e.department_id ? String(e.department_id) : "");
    setDesignationId(e.designation_id ? String(e.designation_id) : "");
    setEmail(e.email || "");
    setMobileNo(e.mobile_no || "");
    setAddress(e.address || "");
    setJoinDate(e.join_date || "");
    setBasicSalary(String(e.basic_salary));
    setBankName(e.bank_name || "");
    setBankAccountNo(e.bank_account_no || "");
    setStatus(e.status || "1");
    setPhotoFile(null);
    setExistingPhotoUrl(e.photo_url || null);
  };

  const handleClear = () => {
    setSelectedId(null);
    setName("");
    setDepartmentId("");
    setDesignationId("");
    setEmail("");
    setMobileNo("");
    setAddress("");
    setJoinDate("");
    setBasicSalary("");
    setBankName("");
    setBankAccountNo("");
    setStatus("1");
    setPhotoFile(null);
    setExistingPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (e.email && e.email.toLowerCase().includes(filterQuery.toLowerCase())) ||
    (e.mobile_no && e.mobile_no.includes(filterQuery))
  );

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalBasicSalary = filteredEmployees.reduce((acc, e) => acc + (Number(e.basic_salary) || 0), 0);

  const handleExportPdf = () => {
    exportReportPdf({
      filenamePrefix: "Employee_List",
      reportTitle: "Employee List",
      periodLabel: `As of ${new Date().toISOString().split("T")[0]}`,
      user,
      summary: [
        { label: "Total Employees", value: String(filteredEmployees.length) },
        { label: "Active", value: String(filteredEmployees.filter((e) => e.status === "1").length) },
        { label: "Total Basic Salary", value: `BDT ${formatMoney(totalBasicSalary)}` },
      ],
      columns: [
        { header: "ID", width: 22, render: (e) => e.employee_code },
        { header: "Name", width: 40, render: (e) => String(e.name).substring(0, 24) },
        { header: "Department", width: 36, render: (e) => (e.department?.name || "").substring(0, 20) },
        { header: "Designation", width: 36, render: (e) => (e.designation?.name || "").substring(0, 20) },
        { header: "Salary (BDT)", width: 28, align: "right", render: (e) => formatMoney(e.basic_salary) },
        { header: "Status", width: 20, render: (e) => (e.status === "1" ? "Active" : "Inactive") },
      ],
      rows: filteredEmployees,
      totalsRow: ["TOTAL", null, null, null, formatMoney(totalBasicSalary), null],
    });
  };

  const handleExportCsv = () => {
    exportReportCsv(
      [
        { header: "Employee ID", render: (e) => e.employee_code },
        { header: "Name", render: (e) => e.name },
        { header: "Department", render: (e) => e.department?.name || "N/A" },
        { header: "Designation", render: (e) => e.designation?.name || "N/A" },
        { header: "Email", render: (e) => e.email || "N/A" },
        { header: "Mobile No", render: (e) => e.mobile_no || "N/A" },
        { header: "Join Date", render: (e) => e.join_date || "N/A" },
        { header: "Basic Salary (BDT)", render: (e) => formatMoney(e.basic_salary) },
        { header: "Status", render: (e) => (e.status === "1" ? "Active" : "Inactive") },
      ],
      filteredEmployees,
      "Employee_List",
      ["TOTAL", "", "", "", "", "", "", formatMoney(totalBasicSalary), ""],
    );
  };

  return (
    <DashboardShell title="Employee List" subtitle="Manage the staff directory used across the Payroll module.">
      <div className={`grid min-w-0 grid-cols-1 gap-6 ${showForm ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {showForm && (
          <div className="card-surface min-w-0 p-5 h-fit space-y-4">
            <h3 className="font-display text-base font-semibold">
              {selectedId ? "Edit Employee" : "Add New Employee"}
            </h3>
            <div className="dark-fields-panel space-y-3 rounded-xl border border-black/20 bg-[#5c5c5c] p-4">
              <div>
                <Label>Employee ID</Label>
                <Input placeholder="Auto-generated" disabled className="bg-slate-50" />
              </div>
              <div>
                <Label>Full Name *</Label>
                <Input
                  placeholder="Enter employee name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Department</Label>
                <Combobox value={departmentId} onChange={setDepartmentId} options={departmentOptions} placeholder="Select department" />
              </div>
              <div>
                <Label>Designation</Label>
                <Combobox value={designationId} onChange={setDesignationId} options={designationOptions} placeholder="Select designation" />
              </div>
              <div>
                <Label>Mobile Number</Label>
                <Input placeholder="Enter mobile number" value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input type="email" placeholder="Enter email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Address</Label>
                <Input placeholder="Enter address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <Label>Join Date</Label>
                <DatePicker value={joinDate} onChange={setJoinDate} />
              </div>
              <div>
                <Label>Basic Salary (৳) *</Label>
                <Input type="number" placeholder="0.00" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} />
                <p className="mt-1 text-xs text-white/60">
                  Used as the default basic salary when generating this employee's payroll.
                </p>
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input placeholder="Optional" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div>
                <Label>Bank Account No.</Label>
                <Input placeholder="Optional" value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} />
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
              <div>
                <Label>Photo</Label>
                <Input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg,image/gif" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                {existingPhotoUrl && !photoFile && (
                  <img src={existingPhotoUrl} alt="Current" className="mt-2 h-16 w-16 rounded-lg object-cover border border-white/20" />
                )}
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              {!selectedId ? (
                <Button
                  className="gradient-primary flex-1"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !name || !basicSalary}
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
                    disabled={updateMutation.isPending || !name || !basicSalary}
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
                <h3 className="font-display text-base font-semibold">All Employees</h3>
                <p className="text-xs text-muted-foreground">{filteredEmployees.length} employees</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={handleExportCsv}>
                    <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPdf}>
                    <Download className="mr-1 h-3.5 w-3.5" />PDF
                  </Button>
                </div>
                <Input
                  placeholder="Filter by name, ID, email..."
                  className="w-full sm:w-64"
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
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">ID</th>
                    <th className="px-5 py-3 font-medium">Department</th>
                    <th className="px-5 py-3 font-medium">Designation</th>
                    <th className="px-5 py-3 font-medium">Mobile No</th>
                    <th className="px-5 py-3 text-right font-medium">Basic Salary (৳)</th>
                    <th className="px-5 py-3 font-medium">Status</th>
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
                  ) : paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-6 text-center text-muted-foreground">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((e, i) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                      return (
                        <tr key={e.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500">{globalIndex}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {e.photo_url ? (
                                <img src={e.photo_url} alt={e.name} className="h-8 w-8 rounded-full object-cover border border-border/60" />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-slate-100 border border-border/60" />
                              )}
                              <span className="font-semibold text-slate-800">{e.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-600">{e.employee_code}</td>
                          <td className="px-5 py-3 text-slate-600">{e.department?.name || "—"}</td>
                          <td className="px-5 py-3 text-slate-600">{e.designation?.name || "—"}</td>
                          <td className="px-5 py-3 text-slate-600 font-mono text-xs">{e.mobile_no || "N/A"}</td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-slate-700">
                            {(Number(e.basic_salary) || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              e.status === "1"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {e.status === "1" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {canManageEmployees && (
                                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => handleSelectForEdit(e)}>
                                  <Pencil className="mr-1 h-3.5 w-3.5" />Edit
                                </Button>
                              )}
                              {canManageEmployees && (
                                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/5" onClick={() => handleDelete(String(e.id), e.name)} disabled={deleteMutation.isPending}>
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

          {filteredEmployees.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredEmployees.length)} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} entries
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
