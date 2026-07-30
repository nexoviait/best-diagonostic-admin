import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  Users,
  AlertCircle,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Search,
  FileSpreadsheet,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/admin-report")({
  component: AdminReportPage,
});

function AdminReportPage() {
  // Default date boundaries: start of current month to today
  const defaultFrom = () => {
    const d = new Date();
    d.setDate(1); // 1st day of current month
    return d.toISOString().split("T")[0];
  };

  const defaultTo = () => {
    return new Date().toISOString().split("T")[0];
  };

  const [dateFrom, setDateFrom] = useState(defaultFrom());
  const [dateTo, setDateTo] = useState(defaultTo());
  const [agencyId, setAgencyId] = useState("all");
  const [mrId, setMrId] = useState("all");
  
  // Local state for fetching triggers
  const [filters, setFilters] = useState({
    from_date: defaultFrom(),
    to_date: defaultTo(),
    agency_id: "all",
    mr_id: "all",
  });

  const [filterQuery, setFilterQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Load dropdown lists
  const { data: agencies = [] } = useQuery<any[]>({
    queryKey: ["agencies"],
    queryFn: () => apiRequest("/agencies"),
  });

  const { data: mrs = [] } = useQuery<any[]>({
    queryKey: ["mrs"],
    queryFn: () => apiRequest("/mrs"),
  });

  // Load summary stats & patients list
  const { data, isLoading, isFetching, refetch, error } = useQuery<any>({
    queryKey: ["reports-summary", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);
      if (filters.agency_id !== "all") params.append("agency_id", filters.agency_id);
      if (filters.mr_id !== "all") params.append("mr_id", filters.mr_id);

      return apiRequest(`/reports/summary?${params.toString()}`);
    },
  });

  useEffect(() => {
    if (error) {
      toastApiError(error, "Failed to load report data.");
    }
  }, [error]);

  const handleSearch = () => {
    setFilters({
      from_date: dateFrom,
      to_date: dateTo,
      agency_id: agencyId,
      mr_id: mrId,
    });
    setCurrentPage(1);
  };

  // Reset pagination on search text change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery]);

  const rawPatients = data?.patients || [];
  const filteredPatients = rawPatients.filter((p: any) => {
    const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
    const query = filterQuery.toLowerCase();
    return (
      p.pax_id?.toLowerCase().includes(query) ||
      p.passport_no?.toLowerCase().includes(query) ||
      fullName.includes(query) ||
      p.agency?.name?.toLowerCase().includes(query) ||
      p.mr?.name?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const summary = data?.summary || {
    total_patients: 0,
    total_sales: 0,
    total_due: 0,
    total_medical_fee: 0,
  };

  // Export functions
  const handleExportCSV = () => {
    if (filteredPatients.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const headers = [
      "PAX ID",
      "Registration Date",
      "First Name",
      "Last Name",
      "Passport No",
      "Agency",
      "MR",
      "Medical Fee (BDT)",
      "Received Amount (BDT)",
      "Due Amount (BDT)",
      "Report Status",
    ];

    const rows = filteredPatients.map((p: any) => [
      p.pax_id || "N/A",
      p.date || "N/A",
      p.first_name || "",
      p.last_name || "",
      p.passport_no || "N/A",
      p.agency?.name || "N/A",
      p.mr?.name || "N/A",
      p.medical_fee || 0,
      p.received_amount || 0,
      p.due_amount || 0,
      p.medical_report?.final_status || "Pending",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) =>
        row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Patient_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully!");
  };

  const handleExportWord = () => {
    if (filteredPatients.length === 0) {
      toast.warning("No data to export");
      return;
    }

    let tableRows = "";
    filteredPatients.forEach((p: any, i: number) => {
      tableRows += `
        <tr>
          <td style="border: 1px solid #ccc; padding: 6px;">${i + 1}</td>
          <td style="border: 1px solid #ccc; padding: 6px;">${p.pax_id || "N/A"}</td>
          <td style="border: 1px solid #ccc; padding: 6px;">${p.date || "N/A"}</td>
          <td style="border: 1px solid #ccc; padding: 6px; font-weight: bold;">${p.first_name || ""} ${p.last_name || ""}</td>
          <td style="border: 1px solid #ccc; padding: 6px;">${p.passport_no || "N/A"}</td>
          <td style="border: 1px solid #ccc; padding: 6px;">${p.agency?.name || "N/A"}</td>
          <td style="border: 1px solid #ccc; padding: 6px;">${p.medical_fee || 0}</td>
          <td style="border: 1px solid #ccc; padding: 6px;">${p.received_amount || 0}</td>
          <td style="border: 1px solid #ccc; padding: 6px;">${p.due_amount || 0}</td>
          <td style="border: 1px solid #ccc; padding: 6px;">${p.medical_report?.final_status || "Pending"}</td>
        </tr>
      `;
    });

    const htmlString = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Patient Report Summary</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #333; }
          .header { text-align: center; margin-bottom: 25px; }
          .title { font-size: 16pt; font-weight: bold; color: #0f172a; margin: 0; }
          .subtitle { font-size: 11pt; color: #64748b; margin-top: 5px; }
          .meta-box { margin-bottom: 20px; border: 1px solid #e2e8f0; padding: 12px; background-color: #f8fafc; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt; }
          th { background-color: #0f172a; color: #ffffff; border: 1px solid #0f172a; padding: 8px; text-align: left; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">BEST HEALTH DIAGNOSTIC LTD.</div>
          <div class="subtitle">Admin Patient Summary Report</div>
          <div style="font-size: 10pt; color: #475569; margin-top: 4px;">Period: ${filters.from_date || "All"} to ${filters.to_date || "All"}</div>
        </div>
        
        <div class="meta-box">
          <strong>Summary Metrics:</strong><br/>
          Total Patients: ${summary.total_patients} | 
          Total Sales: BDT ${summary.total_sales.toLocaleString()} | 
          Total Outstanding Due: BDT ${summary.total_due.toLocaleString()} | 
          Total Fees: BDT ${summary.total_medical_fee.toLocaleString()}
        </div>

        <table>
          <thead>
            <tr>
              <th>SL</th>
              <th>PAX ID</th>
              <th>Date</th>
              <th>Patient Name</th>
              <th>Passport No</th>
              <th>Agency Name</th>
              <th>Fee</th>
              <th>Received</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + htmlString], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Patient_Report_${new Date().toISOString().split("T")[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Word document (.doc) exported successfully!");
  };

  const handleExportPDF = async () => {
    if (filteredPatients.length === 0) {
      toast.warning("No data to export");
      return;
    }

    try {
      // @ts-ignore
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "mm", "a4");
      let pageNumber = 1;

      const drawHeader = (docInstance: any) => {
        // Slate accent bar at the top
        docInstance.setFillColor(15, 23, 42);
        docInstance.rect(0, 0, 210, 8, "F");

        docInstance.setFont("helvetica", "bold");
        docInstance.setFontSize(14);
        docInstance.setTextColor(15, 23, 42);
        docInstance.text("BEST HEALTH DIAGNOSTIC LTD.", 14, 18);

        docInstance.setFontSize(9);
        docInstance.setFont("helvetica", "normal");
        docInstance.setTextColor(100, 116, 139);
        docInstance.text("Admin Patient Summary Report", 14, 23);

        const rangeText = `Period: ${filters.from_date || "All"} to ${filters.to_date || "All"}`;
        docInstance.text(rangeText, 14, 28);

        docInstance.setFontSize(8);
        docInstance.text(`Page ${pageNumber}`, 190, 18);

        // Thin separator line
        docInstance.setDrawColor(226, 232, 240);
        docInstance.line(14, 32, 196, 32);
      };

      drawHeader(doc);

      let y = 38;
      // Visual box for summary figures on page 1
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, 182, 14, 1.5, 1.5, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Total Patients: ${summary.total_patients}`, 18, y + 9);
      doc.text(`Total Sales: BDT ${summary.total_sales.toLocaleString()}`, 60, y + 9);
      doc.text(`Total Due: BDT ${summary.total_due.toLocaleString()}`, 115, y + 9);
      doc.text(`Total Billing: BDT ${summary.total_medical_fee.toLocaleString()}`, 158, y + 9);

      y += 22; // 60

      // Table Header row background
      doc.setFillColor(15, 23, 42);
      doc.rect(14, y, 182, 8, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("SL", 16, y + 5.5);
      doc.text("PAX ID", 22, y + 5.5);
      doc.text("Date", 40, y + 5.5);
      doc.text("Patient Name", 56, y + 5.5);
      doc.text("Passport No", 96, y + 5.5);
      doc.text("Agency", 122, y + 5.5);
      doc.text("Fee", 160, y + 5.5);
      doc.text("Received", 174, y + 5.5);
      doc.text("Due", 189, y + 5.5);

      y += 8;

      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");

      filteredPatients.forEach((p: any, index: number) => {
        // Create new page if cursor gets close to the bottom
        if (y > 275) {
          doc.addPage();
          pageNumber++;
          y = 35;
          drawHeader(doc);

          // Render Table Header row background on the new page too
          doc.setFillColor(15, 23, 42);
          doc.rect(14, y, 182, 8, "F");
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.text("SL", 16, y + 5.5);
          doc.text("PAX ID", 22, y + 5.5);
          doc.text("Date", 40, y + 5.5);
          doc.text("Patient Name", 56, y + 5.5);
          doc.text("Passport No", 96, y + 5.5);
          doc.text("Agency", 122, y + 5.5);
          doc.text("Fee", 160, y + 5.5);
          doc.text("Received", 174, y + 5.5);
          doc.text("Due", 189, y + 5.5);

          y += 8;
          doc.setTextColor(71, 85, 105);
          doc.setFont("helvetica", "normal");
        }

        // Alternating background stripe
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 5.5, "F");
        }

        doc.text(String(index + 1), 16, y + 4);
        doc.text(p.pax_id || "N/A", 22, y + 4);
        doc.text(p.date || "N/A", 40, y + 4);
        
        const fullName = `${p.first_name || ""} ${p.last_name || ""}`;
        doc.text(fullName.substring(0, 20), 56, y + 4);
        doc.text(p.passport_no || "N/A", 96, y + 4);
        doc.text((p.agency?.name || "N/A").substring(0, 18), 122, y + 4);
        doc.text(String(p.medical_fee || 0), 160, y + 4);
        doc.text(String(p.received_amount || 0), 174, y + 4);
        doc.text(String(p.due_amount || 0), 189, y + 4);

        y += 5.5;
      });

      doc.save(`Patient_Report_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF generated and downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF file.");
    }
  };

  return (
    <DashboardShell
      title="Admin Report"
      subtitle="Analyze daily, weekly, and monthly center metrics and export patient transaction data."
    >
      <div className="flex flex-col gap-6">
        {/* Filters Panel */}
        <div className="card-surface p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            <Calendar className="h-4.5 w-4.5 text-primary" />
            <h3 className="font-display text-sm font-semibold">Filter Report Parameters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
            <div className="space-y-1.5">
              <Label>Agency</Label>
              <Select value={agencyId} onValueChange={setAgencyId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agencies</SelectItem>
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>MR</Label>
              <Select value={mrId} onValueChange={setMrId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All MRs</SelectItem>
                  {mrs.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
            <Button
              variant="outline"
              onClick={() => {
                refetch();
              }}
              disabled={isLoading || isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Reload
            </Button>
            <Button onClick={handleSearch} className="gradient-primary" disabled={isLoading}>
              Generate Report
            </Button>
          </div>
        </div>

        {/* Dashboard Metrics */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-surface p-6 h-28 animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover-lift overflow-hidden border-border/60 bg-gradient-to-br from-white to-emerald-50/20 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Patients
                    </p>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-slate-800">
                      {summary.total_patients}
                    </h3>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-emerald-600 font-medium">
                  <TrendingUp className="h-3 w-3" />
                  <span>registered in this period</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift overflow-hidden border-border/60 bg-gradient-to-br from-white to-blue-50/20 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Daily Sales
                    </p>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-slate-800">
                      ৳{summary.total_sales.toLocaleString()}
                    </h3>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-blue-600 font-medium">
                  <TrendingUp className="h-3 w-3" />
                  <span>collected revenue</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift overflow-hidden border-border/60 bg-gradient-to-br from-white to-orange-50/20 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Outstanding Dues
                    </p>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-slate-800">
                      ৳{summary.total_due.toLocaleString()}
                    </h3>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-orange-600 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  <span>unpaid balance</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift overflow-hidden border-border/60 bg-gradient-to-br from-white to-violet-50/20 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Billing Amount
                    </p>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-slate-800">
                      ৳{summary.total_medical_fee.toLocaleString()}
                    </h3>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-violet-600 font-medium">
                  <Activity className="h-3 w-3" />
                  <span>total medical fees</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts & Trends */}
        <div className="card-surface p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-3">
            <div>
              <h3 className="font-display text-base font-semibold">Visual Analytics & Performance</h3>
              <p className="text-xs text-muted-foreground">View patterns of daily, weekly, and monthly sales and dues</p>
            </div>
          </div>

          <Tabs defaultValue="daily" className="w-full">
            <div className="flex justify-center mb-4">
              <TabsList className="flex w-full sm:w-auto overflow-x-auto">
                <TabsTrigger value="daily" className="flex-1 sm:flex-initial whitespace-nowrap text-xs sm:text-sm">Daily Sales & Dues</TabsTrigger>
                <TabsTrigger value="weekly" className="flex-1 sm:flex-initial whitespace-nowrap text-xs sm:text-sm">Weekly Overview</TabsTrigger>
                <TabsTrigger value="monthly" className="flex-1 sm:flex-initial whitespace-nowrap text-xs sm:text-sm">Monthly Overview</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="daily" className="h-[280px] sm:h-[320px] focus-visible:ring-0 outline-none">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center animate-pulse bg-muted/10 rounded-lg" />
              ) : (data?.daily_stats || []).length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  No daily records found.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily_stats} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDues" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      name="Sales (Received)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                    <Area
                      type="monotone"
                      dataKey="dues"
                      name="Dues"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorDues)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </TabsContent>

            <TabsContent value="weekly" className="h-[280px] sm:h-[320px] focus-visible:ring-0 outline-none">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center animate-pulse bg-muted/10 rounded-lg" />
              ) : (data?.weekly_stats || []).length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  No weekly records found.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekly_stats} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="sales" name="Sales (Received)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dues" name="Dues" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>

            <TabsContent value="monthly" className="h-[280px] sm:h-[320px] focus-visible:ring-0 outline-none">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center animate-pulse bg-muted/10 rounded-lg" />
              ) : (data?.monthly_stats || []).length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  No monthly records found.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly_stats} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="sales" name="Sales (Received)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dues" name="Dues" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Detailed Data List */}
        <div className="card-surface min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-4 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-semibold">Patient Records Data</h3>
                <p className="text-xs text-muted-foreground">
                  {filteredPatients.length} patient transactions found in filter range
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, PAX, passport..."
                    className="pl-8"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial text-emerald-600 border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700 font-medium"
                    onClick={handleExportCSV}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial text-blue-600 border-blue-200 hover:bg-blue-50/50 hover:text-blue-700 font-medium"
                    onClick={handleExportWord}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Word
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial text-rose-600 border-rose-200 hover:bg-rose-50/50 hover:text-rose-700 font-medium"
                    onClick={handleExportPDF}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-slate-50/50">
                    <th className="px-5 py-3 font-medium w-12">SL</th>
                    <th className="px-5 py-3 font-medium">PAX ID</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Patient Name</th>
                    <th className="px-5 py-3 font-medium">Passport No</th>
                    <th className="px-5 py-3 font-medium">Agency</th>
                    <th className="px-5 py-3 font-medium">MR</th>
                    <th className="px-5 py-3 text-right font-medium">Fee (৳)</th>
                    <th className="px-5 py-3 text-right font-medium">Received (৳)</th>
                    <th className="px-5 py-3 text-right font-medium">Due (৳)</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="px-5 py-6 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Activity className="h-4 w-4 animate-spin text-primary" />
                          Loading list...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedPatients.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-5 py-6 text-center text-muted-foreground">
                        No transactions found matching search filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedPatients.map((p: any, i: number) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                      const reportStatus = p.medical_report?.final_status || "Pending";
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors"
                        >
                          <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{globalIndex}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-800">{p.pax_id}</td>
                          <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{p.date}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-800">
                            {p.first_name} {p.last_name}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                            {p.passport_no || "N/A"}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 font-medium">
                            {p.agency?.name || "N/A"}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{p.mr?.name || "N/A"}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-700">
                            {(Number(p.medical_fee) || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-700">
                            {(Number(p.received_amount) || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-700">
                            {(Number(p.due_amount) || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border shadow-none ${
                                reportStatus.toUpperCase() === "FIT"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : reportStatus.toUpperCase() === "UNFIT"
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {reportStatus}
                            </Badge>
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
          {filteredPatients.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredPatients.length)} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredPatients.length)} of{" "}
                {filteredPatients.length} entries
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
                        pages.push(1, 2, 3, 4, 5, "...", total);
                      } else if (current >= total - 3) {
                        pages.push(1, "...", total - 4, total - 3, total - 2, total - 1, total);
                      } else {
                        pages.push(1, "...", current - 1, current, current + 1, "...", total);
                      }
                    }
                    return pages;
                  };
                  return getPageNumbers(currentPage, totalPages).map((page, idx) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`el-${idx}`}
                          className="px-2 py-1 text-sm text-muted-foreground self-end"
                        >
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 p-0 ${
                          currentPage === page ? "gradient-primary text-white" : ""
                        }`}
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
