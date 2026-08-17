import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Search, Loader2, Pencil, Trash2, FileText, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";

export const Route = createFileRoute("/database")({
  component: DatabasePage,
  validateSearch: (search: Record<string, unknown>): { q?: string; field?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    field: typeof search.field === "string" ? search.field : undefined,
  }),
});

function FilterCard({
  title,
  children,
  onSearch,
}: {
  title: string;
  children: React.ReactNode;
  onSearch: () => void;
}) {
  return (
    <div className="dark-fields-panel flex flex-col gap-3 rounded-xl border border-black/20 bg-[#5c5c5c] p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="shrink-0 text-xs font-medium uppercase tracking-wider text-white sm:w-[90px]">
        {title}
      </div>
      {children}
      <Button onClick={onSearch} className="w-full gradient-primary sm:ml-auto sm:w-auto">
        <Search className="mr-1 h-4 w-4" /> Search
      </Button>
    </div>
  );
}

function DatabasePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();

  // Search parameters
  const [searchField, setSearchField] = useState(searchParams.field || "pax");
  const [searchValue, setSearchValue] = useState(searchParams.q || "");

  const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [dateFrom, setDateFrom] = useState(getTodayDate);
  const [dateTo, setDateTo] = useState(getTodayDate);

  const [agencyId, setAgencyId] = useState("all");
  const [mrId, setMrId] = useState("all");
  const [creatorId, setCreatorId] = useState("all");

  const [filters, setFilters] = useState<Record<string, string>>(
    searchParams.q
      ? { search_field: searchParams.field || "pax", search_value: searchParams.q }
      : {},
  );

  // Re-run the ID search whenever the top header search bar sends a new query
  // to this page (covers both a fresh navigation and searching again while
  // already on the Database page).
  useEffect(() => {
    if (!searchParams.q) return;
    const field = searchParams.field || "pax";
    setSearchField(field);
    setSearchValue(searchParams.q);
    setFilters({ search_field: field, search_value: searchParams.q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.q, searchParams.field]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/patients/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Patient deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to delete patient.");
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Delete patient "${name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (paxId: string) => {
    // Navigate to entry form and store paxId in sessionStorage for auto-load
    sessionStorage.setItem("entryform_load_pax", paxId);
    navigate({ to: "/entry-form" });
  };

  // Fetch dropdown options
  const { data: agencies = [] } = useQuery<any[]>({
    // include_one_time: this filter needs to find patients registered under
    // a one-time (walk-in) agency too, so it fetches the full list — unlike
    // the Entry Form's agency picker, which hides those by default.
    queryKey: ["agencies", "all"],
    queryFn: () => apiRequest("/agencies?include_one_time=1"),
  });

  const { data: mrs = [] } = useQuery<any[]>({
    queryKey: ["mrs"],
    queryFn: () => apiRequest("/mrs"),
  });

  const { data: creators = [] } = useQuery<any[]>({
    queryKey: ["creators"],
    queryFn: () => apiRequest("/patients/creators"),
  });

  // Fetch filtered patients
  const { data: patients = [], isLoading, isFetching } = useQuery<any[]>({
    queryKey: ["patients", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.search_field && filters.search_value) {
        params.append("search_field", filters.search_field);
        params.append("search_value", filters.search_value);
      }
      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);
      if (filters.agency_id && filters.agency_id !== "all") params.append("agency_id", filters.agency_id);
      if (filters.mr_id && filters.mr_id !== "all") params.append("mr_id", filters.mr_id);
      if (filters.created_by && filters.created_by !== "all") params.append("created_by", filters.created_by);
      // Newest entries first in this Results table specifically.
      params.append("sort_dir", "desc");

      return apiRequest(`/patients?${params.toString()}`);
    },
  });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canEditPatient = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('edit_patient');
  const canDeletePatient = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('delete_patient');

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const [printRequest, setPrintRequest] = useState<{title: string, dateRange: string, timestamp: number} | null>(null);

  const generatePrintHTML = (patientsData: any[], title: string, dateRange: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print reports.");
      return;
    }

    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const totalMedicalFee = (patientsData || []).reduce((acc, curr) => acc + (Number(curr?.medical_fee) || 0), 0);
    const totalNiddleCharge = (patientsData || []).reduce((acc, curr) => acc + (Number(curr?.niddle_charge) || 0), 0);
    const totalNet = totalMedicalFee + totalNiddleCharge;
    const totalReceived = (patientsData || []).reduce((acc, curr) => acc + (Number(curr?.received_amount) || 0), 0);
    const totalDue = (patientsData || []).reduce((acc, curr) => acc + (Number(curr?.due_amount) || 0), 0);

    const sortedPatients = [...(patientsData || [])].sort((a, b) => ((a && a.id) || 0) - ((b && b.id) || 0));

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          body { font-family: 'Arial', sans-serif; padding: 10px; font-size: 9px; color: #000; }
          .header { display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold; background-color: #e0e0e0; padding: 6px; border: 1px solid #000; font-size: 10px; }
          .title { font-size: 13px; margin-bottom: 8px; font-weight: bold; text-align: left; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 8.5px; }
          th, td { border: 1px solid #000; padding: 3px 4px; text-align: center; word-break: break-word; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .summary-boxes { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 15px; font-size: 9px; justify-content: flex-start; }
          .summary-box { border: 1px solid #000; padding: 3px 6px; display: flex; gap: 6px; align-items: center; }
          .summary-label { font-weight: bold; }
          @media print {
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 8px 16px; background-color: #0f172a; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Print / Save as PDF</button>
        </div>
        <div class="title">${title}</div>
        <div class="header">
          <div>Searching Result: <span style="font-weight:normal; margin-left:10px;">${dateRange || 'All Data'}</span></div>
          <div>Printing Date : <span style="font-weight:normal; margin-left:10px;">${today}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>SL</th>
              <th>Entry Date</th>
              <th>Px ID</th>
              <th>Name</th>
              <th>PP No</th>
              <th>Agency</th>
              <th>MR</th>
              <th>Total Fee</th>
              <th>Received</th>
              <th>Niddle</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            ${sortedPatients.length === 0 ? '<tr><td colspan="11">No records found</td></tr>' : ''}
            ${sortedPatients.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p?.date ? new Date(p.date).toLocaleDateString('en-GB') : ''}</td>
                <td>${p?.pax_id || ''}</td>
                <td style="text-align:left;">${p?.first_name || ''} ${p?.last_name || ''}</td>
                <td>${p?.passport_no || ''}</td>
                <td>${p?.agency?.name || ''}</td>
                <td>${p?.mr?.name || ''}</td>
                <td>${p?.medical_fee || 0}</td>
                <td>${p?.received_amount || 0}</td>
                <td>${p?.niddle_charge || 0}</td>
                <td>${p?.medicalReport?.final_status || 'Pending'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary-boxes">
            <div class="summary-box"><span class="summary-label">Medical Fee:</span> ${totalMedicalFee} /-</div>
            <div class="summary-box"><span class="summary-label">Niddle Charge:</span> ${totalNiddleCharge} /-</div>
            <div class="summary-box"><span class="summary-label">Total:</span> ${totalNet} /-</div>
            <div class="summary-box"><span class="summary-label">M.Fee Received:</span> ${totalReceived} /-</div>
            <div class="summary-box"><span class="summary-label">Total Received:</span> ${totalReceived} /-</div>
            <div class="summary-box"><span class="summary-label">Total Due:</span> ${totalDue} /-</div>
        </div>
      </body>
      </html>
    `;
    // Load via a Blob URL instead of document.write(). A window opened with
    // window.open("", "_blank") sits on "about:blank" — document.write()
    // paints content onto it, but that content has no real source, so
    // reloading the tab wipes it back to blank. Navigating to a blob: URL
    // gives it an actual, reloadable source.
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    printWindow.location.href = blobUrl;
  };

  useEffect(() => {
    if (printRequest && !isLoading && !isFetching) {
      // Small timeout to ensure state is settled
      const timer = setTimeout(() => {
        generatePrintHTML(patients, printRequest.title, printRequest.dateRange);
        setPrintRequest(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [patients, isLoading, isFetching, printRequest]);

  const formatDateLabel = (d: string) => d ? new Date(d).toLocaleDateString('en-GB') : '';

  const handleSearchByID = () => {
    setFilters({
      search_field: searchField,
      search_value: searchValue,
    });
    setPrintRequest({
      title: `Search By ID - ${searchField.toUpperCase()}: ${searchValue}`,
      dateRange: 'All Data',
      timestamp: Date.now()
    });
  };

  const handleSearchByDate = () => {
    setFilters({
      from_date: dateFrom,
      to_date: dateTo,
    });
    const range = (dateFrom || dateTo) ? `From: ${formatDateLabel(dateFrom)}  To: ${formatDateLabel(dateTo)}` : 'All Dates';
    setPrintRequest({
      title: 'Daily / Monthly Statement For Office',
      dateRange: range,
      timestamp: Date.now()
    });
  };

  const handleSearchByAgency = () => {
    setFilters({
      agency_id: agencyId,
      from_date: dateFrom,
      to_date: dateTo,
    });
    const agencyName = agencyId === "all" ? "ALL AGENCIES" : agencies.find(a => String(a.id) === String(agencyId))?.name || "";
    const range = (dateFrom || dateTo) ? `From: ${formatDateLabel(dateFrom)}  To: ${formatDateLabel(dateTo)}` : 'All Dates';
    setPrintRequest({
      title: `Agency History  ${agencyName}`,
      dateRange: range,
      timestamp: Date.now()
    });
  };

  const handleSearchByMR = () => {
    setFilters({
      mr_id: mrId,
      from_date: dateFrom,
      to_date: dateTo,
    });
    const mrName = mrId === "all" ? "ALL MRs" : mrs.find(m => String(m.id) === String(mrId))?.name || "";
    const range = (dateFrom || dateTo) ? `From: ${formatDateLabel(dateFrom)}  To: ${formatDateLabel(dateTo)}` : 'All Dates';
    setPrintRequest({
      title: `MR History  ${mrName}`,
      dateRange: range,
      timestamp: Date.now()
    });
  };

  const handleSearchByCreator = () => {
    setFilters({
      created_by: creatorId,
      from_date: dateFrom,
      to_date: dateTo,
    });
    const creatorName = creatorId === "all" ? "ALL USERS" : creators.find(c => String(c.id) === String(creatorId))?.name || "";
    const range = (dateFrom || dateTo) ? `From: ${formatDateLabel(dateFrom)}  To: ${formatDateLabel(dateTo)}` : 'All Dates';
    setPrintRequest({
      title: `Created By  ${creatorName}`,
      dateRange: range,
      timestamp: Date.now()
    });
  };

  // Paginated Patient Calculations
  const totalPages = Math.ceil(patients.length / itemsPerPage);
  const paginatedPatients = patients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardShell title="Database" subtitle="Search and filter the full patient database.">
      <div className="grid gap-3">
        <FilterCard title="By ID" onSearch={handleSearchByID}>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
            <div className="w-full sm:w-[140px]">
              <Label className="text-xs">Field</Label>
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pax">Pax_Id</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[240px]">
              <Label className="text-xs">Value</Label>
              <Input
                placeholder="Type to search…"
                className="w-full"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
          </div>
        </FilterCard>

        <FilterCard title="By date" onSearch={handleSearchByDate}>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
            <div className="w-full sm:w-[160px]">
              <Label className="text-xs">From</Label>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="w-full sm:w-[160px]">
              <Label className="text-xs">To</Label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
          </div>
        </FilterCard>

        <FilterCard title="By agency" onSearch={handleSearchByAgency}>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
            <div className="w-full sm:w-[200px]">
              <Label className="text-xs">Agency</Label>
              <Combobox
                value={agencyId}
                onChange={setAgencyId}
                placeholder="Select agency"
                searchPlaceholder="Type to search agency..."
                options={[
                  { value: "all", label: "ALL AGENCIES" },
                  ...agencies.map((a) => ({ value: String(a.id), label: a.name })),
                ]}
              />
            </div>
            <div className="w-full sm:w-[160px]">
              <Label className="text-xs">From</Label>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="w-full sm:w-[160px]">
              <Label className="text-xs">To</Label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
          </div>
        </FilterCard>

        <FilterCard title="By MR" onSearch={handleSearchByMR}>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
            <div className="w-full sm:w-[200px]">
              <Label className="text-xs">MR</Label>
              <Combobox
                value={mrId}
                onChange={setMrId}
                placeholder="Select MR"
                searchPlaceholder="Type to search MR..."
                options={[
                  { value: "all", label: "ALL MRs" },
                  ...mrs.map((m) => ({ value: String(m.id), label: m.name })),
                ]}
              />
            </div>
            <div className="w-full sm:w-[160px]">
              <Label className="text-xs">From</Label>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="w-full sm:w-[160px]">
              <Label className="text-xs">To</Label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
          </div>
        </FilterCard>

        <FilterCard title="By Creator" onSearch={handleSearchByCreator}>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
            <div className="w-full sm:w-[200px]">
              <Label className="text-xs">Created By</Label>
              <Select value={creatorId} onValueChange={setCreatorId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ALL USERS</SelectItem>
                  {creators.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[160px]">
              <Label className="text-xs">From</Label>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="w-full sm:w-[160px]">
              <Label className="text-xs">To</Label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
          </div>
        </FilterCard>
      </div>

      <div className="card-surface mt-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-border/60 p-5">
            <div>
              <h3 className="font-display text-base font-semibold">Results</h3>
              <p className="text-xs text-muted-foreground">{patients.length} records matching filters</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">Live</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  <th className="px-4 py-3 font-medium">SL</th>
                  <th className="px-4 py-3 font-medium">Entry Date</th>
                  <th className="px-4 py-3 font-medium">Pax ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Agency</th>
                  <th className="px-4 py-3 font-medium">MR</th>
                  <th className="px-4 py-3 font-medium">Report Status</th>
                  <th className="px-4 py-3 font-medium">X-Ray Result</th>
                  <th className="px-4 py-3 text-right font-medium">Total Fee (৳)</th>
                  <th className="px-4 py-3 text-right font-medium">Received (৳)</th>
                  <th className="px-4 py-3 text-right font-medium">Due (৳)</th>
                  <th className="px-4 py-3 font-medium">Created By</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-6 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Loading records...
                      </div>
                    </td>
                  </tr>
                ) : paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-6 text-center text-muted-foreground">
                      No matching patient records found.
                    </td>
                  </tr>
                ) : (
                  paginatedPatients.map((r, index) => {
                    const serialNum = (currentPage - 1) * itemsPerPage + index + 1;
                    const reportStatus = r.medicalReport?.final_status || "Held up";
                    const xrayStatus = r.xrayReport?.result || "Pending";
                    return (
                      <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 whitespace-nowrap">
                        <td className="px-4 py-3 text-muted-foreground">{serialNum}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-3 font-mono text-xs text-primary font-semibold whitespace-nowrap">{r.pax_id}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{r.first_name} {r.last_name || ""}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.agency?.name || "N/A"}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.mr?.name || "N/A"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            reportStatus.toUpperCase() === "FIT"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : reportStatus.toUpperCase() === "UNFIT"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {reportStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            xrayStatus === "Fit"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : xrayStatus === "Unfit"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}>
                            {xrayStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{(Number(r.medical_fee) || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-success font-medium whitespace-nowrap">{(Number(r.received_amount) || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-destructive font-medium whitespace-nowrap">{(Number(r.due_amount) || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.creator?.name || "N/A"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Medical Report Action */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                              onClick={() => {
                                const route = r.country?.name?.toLowerCase() === 'malaysia' ? '/malaysia-report' : '/report-entry';
                                navigate({ to: route, search: { patient_id: r.pax_id } });
                              }}
                              title="Enter Medical Report"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>

                            {/* X-Ray Report Action */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => {
                                sessionStorage.setItem("xray_load_pax", r.pax_id);
                                navigate({ to: "/xray" });
                              }}
                              title="Upload X-Ray"
                            >
                              <ScanLine className="h-4 w-4" />
                            </Button>

                            {canEditPatient && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => handleEdit(r.pax_id)}
                                title="Edit patient details"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDeletePatient && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(r.id, `${r.first_name} ${r.last_name || ""}`)}
                                disabled={deleteMutation.isPending}
                                title="Delete patient"
                              >
                                {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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

        {/* Office Statement Aggregate Totals */}
        {patients.length > 0 && (
          <div className="border-t border-border/60 p-5 bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Office Statement Totals</h4>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-5 text-sm">
              <div className="bg-background rounded-lg border p-3 flex flex-col">
                <span className="text-xs text-muted-foreground">Medical Fee</span>
                <span className="font-semibold mt-1">৳ {patients.reduce((acc, curr) => acc + (Number(curr.medical_fee) || 0), 0).toLocaleString()}</span>
              </div>
              <div className="bg-background rounded-lg border p-3 flex flex-col">
                <span className="text-xs text-muted-foreground">Needle Charge</span>
                <span className="font-semibold mt-1">৳ {patients.reduce((acc, curr) => acc + (Number(curr.niddle_charge) || 0), 0).toLocaleString()}</span>
              </div>
              <div className="bg-background rounded-lg border p-3 flex flex-col">
                <span className="text-xs text-muted-foreground">Total Net</span>
                <span className="font-semibold mt-1 text-primary">৳ {(patients.reduce((acc, curr) => acc + (Number(curr.medical_fee) || 0), 0) + patients.reduce((acc, curr) => acc + (Number(curr.niddle_charge) || 0), 0)).toLocaleString()}</span>
              </div>
              <div className="bg-background rounded-lg border p-3 flex flex-col">
                <span className="text-xs text-muted-foreground">Total Received</span>
                <span className="font-semibold mt-1 text-success">৳ {patients.reduce((acc, curr) => acc + (Number(curr.received_amount) || 0), 0).toLocaleString()}</span>
              </div>
              <div className="bg-background rounded-lg border p-3 flex flex-col">
                <span className="text-xs text-muted-foreground">Total Due</span>
                <span className="font-semibold mt-1 text-destructive">৳ {patients.reduce((acc, curr) => acc + (Number(curr.due_amount) || 0), 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {patients.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, patients.length)} to {Math.min(currentPage * itemsPerPage, patients.length)} of {patients.length} entries
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
    </DashboardShell>
  );
}
