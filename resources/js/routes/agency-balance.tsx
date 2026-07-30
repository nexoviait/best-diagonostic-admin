import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Printer, Send, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import { DatePicker } from "@/components/ui/date-picker";

export const Route = createFileRoute("/agency-balance")({ component: AgencyBalancePage });

// Simple number to words function for Taka
function numberToWords(num: number): string {
  if (num === 0) return "Zero Taka Only";
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? convert(n % 1000) : '');
    return "";
  };

  return convert(num).trim() + " Taka Only";
}

function AgencyBalancePage() {
  const [selectedAgencyId, setSelectedAgencyId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Payment form states
  const [payAgencyId, setPayAgencyId] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [payWords, setPayWords] = useState("");
  const [payMonth, setPayMonth] = useState(new Date().toISOString().substring(0, 7));

  // Load agencies
  const { data: agencies = [] } = useQuery<any[]>({
    queryKey: ["agencies"],
    queryFn: () => apiRequest("/agencies"),
  });

  // Load public site settings (for printable headers/footers)
  const { data: settings } = useQuery<any>({
    queryKey: ["publicSettings"],
    queryFn: () => apiRequest("/public/site-settings"),
  });

  // Query Invoices
  const { data: invoiceData, isLoading, refetch } = useQuery<{ invoices: any[]; summary: any }>({
    queryKey: ["invoices", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.agency_id && filters.agency_id !== "all") params.append("agency_id", filters.agency_id);
      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);
      return apiRequest(`/invoices?${params.toString()}`);
    },
  });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canAddPayment = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('add_payment');

  // Load dues for selected payment agency
  const { data: payAgencyData } = useQuery<any>({
    queryKey: ["payAgencyDues", payAgencyId],
    queryFn: () => apiRequest(`/invoices?agency_id=${payAgencyId}`),
    enabled: !!payAgencyId && payAgencyId !== "all",
  });

  const payAgencyDues = payAgencyData?.summary?.due_total || 0;

  const handleFilter = () => {
    setFilters({
      agency_id: selectedAgencyId,
      from_date: dateFrom,
      to_date: dateTo,
    });
  };

  useEffect(() => {
    setPayWords(numberToWords(payAmount));
  }, [payAmount]);

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/invoices", {
        method: "POST",
        body: JSON.stringify({
          agency_id: payAgencyId,
          date: new Date().toISOString().split("T")[0],
          net_amount: 0,
          received_amount: payAmount,
          due_amount: -payAmount,
          in_words: payWords,
          payment_month: payMonth,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully!");
      setPayAmount(0);
      refetch();
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to record payment.");
    },
  });

  const handleRecordPayment = () => {
    if (!payAgencyId || payAmount <= 0) {
      toast.error("Please select an agency and input a valid payment amount.");
      return;
    }
    recordPaymentMutation.mutate();
  };

  const handlePrintInvoice = (i: any) => {
    const printWindow = window.open("", "_blank", "width=850,height=750");
    if (!printWindow) return;

    const logoHtml = settings?.logo_path
      ? `<img src="${settings.logo_path}" alt="Logo" class="logo" />`
      : "";

    const htmlContent = `
      <html>
      <head>
        <title>Receipt - ${i.invoice_no}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            margin: 0;
            padding: 40px;
            font-size: 14px;
            line-height: 1.5;
          }
          .header-container {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            border-bottom: 2px solid #0d9488;
            padding-bottom: 15px;
            margin-bottom: 25px;
            text-align: center;
          }
          .logo {
            max-height: 60px;
            margin-bottom: 8px;
            object-fit: contain;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #0d9488;
            margin: 0;
          }
          .company-title {
            font-size: 12px;
            color: #666;
            margin: 2px 0 0 0;
          }
          .company-details {
            font-size: 11px;
            color: #555;
            margin-top: 5px;
          }
          .invoice-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 20px 0;
            text-transform: uppercase;
            color: #1e293b;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .meta-box p {
            margin: 4px 0;
          }
          .meta-box strong {
            color: #1e293b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 600;
            text-align: left;
            border-bottom: 2px solid #e2e8f0;
          }
          th, td {
            padding: 10px 12px;
            border-bottom: 1px solid #edf2f7;
          }
          .text-right {
            text-align: right;
          }
          .total-row td {
            font-weight: bold;
            color: #0f172a;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px double #cbd5e1;
            background-color: #f8fafc;
          }
          .in-words {
            font-style: italic;
            margin-bottom: 40px;
            color: #475569;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 80px;
          }
          .signature-box {
            text-align: center;
            width: 200px;
          }
          .signature-line {
            border-top: 1px dashed #cbd5e1;
            padding-top: 6px;
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
          }
          .signature-img {
            max-height: 40px;
            object-fit: contain;
            margin-bottom: 4px;
          }
          .copyright {
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 80px;
            border-top: 1px solid #f1f5f9;
            padding-top: 10px;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          ${logoHtml}
          <h1 class="company-name">${settings?.company_name_en || "Best Health"}</h1>
          <p class="company-title">${settings?.company_name_en_title || "Diagnostic & Medical Center"}</p>
          <p class="company-details">
            ${settings?.company_address_en || ""}<br>
            Phone: ${settings?.company_phone_en || ""}
          </p>
        </div>

        <div class="invoice-title">Transaction Receipt</div>

        <div class="meta-grid">
          <div class="meta-box">
            <p><strong>Agency Name:</strong> ${i.agency?.name || "N/A"}</p>
            <p><strong>Contact Person:</strong> ${i.agency?.contact_person || "N/A"}</p>
            <p><strong>Mobile No:</strong> ${i.agency?.mobile_no || "N/A"}</p>
          </div>
          <div class="meta-box" style="text-align: right;">
            <p><strong>Receipt ID:</strong> ${i.invoice_no}</p>
            <p><strong>Date:</strong> ${i.date}</p>
            <p><strong>Payment Month:</strong> ${i.payment_month || "N/A"}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Transaction Details</th>
              <th class="text-right">Net Amount</th>
              <th class="text-right">Received Amount</th>
              <th class="text-right">Due Outstanding Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                ${Number(i.net_amount) > 0 ? "Agency Assessment Billing / Invoice Generation" : "Recorded Agency Payment / Collection"}
              </td>
              <td class="text-right">৳ ${(Number(i.net_amount) || 0).toLocaleString()}</td>
              <td class="text-right">৳ ${(Number(i.received_amount) || 0).toLocaleString()}</td>
              <td class="text-right">৳ ${(Number(i.due_amount) || 0).toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td>Total</td>
              <td class="text-right">৳ ${(Number(i.net_amount) || 0).toLocaleString()}</td>
              <td class="text-right">৳ ${(Number(i.received_amount) || 0).toLocaleString()}</td>
              <td class="text-right">৳ ${(Number(i.due_amount) || 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="in-words">
          <strong>Amount in Words:</strong> ${i.in_words || numberToWords(Number(i.received_amount || i.net_amount))}
        </div>

        <div class="footer-section">
          <div class="signature-box">
            <div class="signature-line">Prepared By</div>
          </div>
          <div class="signature-box">
            ${settings?.signature_authorised_path ?
        `<img src="${settings.signature_authorised_path}" class="signature-img" />` :
        `<div style="height: 40px;"></div>`
      }
            <div class="signature-line">Authorized Cashier</div>
          </div>
        </div>

        <div class="copyright">
          &copy; ${new Date().getFullYear()} ${settings?.company_name_en || "Best Health"}. All Rights Reserved. Developed by Nexovia IT Limited
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const invoices = invoiceData?.invoices || [];
  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const paginatedInvoices = invoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const summary = invoiceData?.summary || { net_total: 0, received_total: 0, due_total: 0 };

  return (
    <DashboardShell title="Agency Balance" subtitle="Track invoices, receipts and dues per agency.">
      <div className="card-surface p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <Label className="text-xs">Agency</Label>
            <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
              <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL AGENCIES</SelectItem>
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <DatePicker value={dateFrom} onChange={setDateFrom} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <DatePicker value={dateTo} onChange={setDateTo} />
          </div>
          <Button onClick={handleFilter} className="gradient-primary"><Filter className="mr-1 h-4 w-4" />Filter</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <p className="text-xs uppercase text-muted-foreground">Net Total</p>
          <p className="mt-2 font-display text-2xl font-semibold">
            ৳ {isLoading ? "..." : (Number(summary.net_total) || 0).toLocaleString()}
          </p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs uppercase text-muted-foreground">Received</p>
          <p className="mt-2 font-display text-2xl font-semibold text-success">
            ৳ {isLoading ? "..." : (Number(summary.received_total) || 0).toLocaleString()}
          </p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs uppercase text-muted-foreground">Due</p>
          <p className="mt-2 font-display text-2xl font-semibold text-destructive">
            ৳ {isLoading ? "..." : (Number(summary.due_total) || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="card-surface">
        <div className="border-b border-border/60 p-5"><h3 className="font-display text-base font-semibold">Invoices & Receipts</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-slate-50/50">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Agency</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 text-right font-medium">Net (৳)</th>
                <th className="px-5 py-3 text-right font-medium">Received (৳)</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading records...
                    </div>
                  </td>
                </tr>
              ) : paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-muted-foreground">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((i) => (
                  <tr key={i.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-primary font-semibold">{i.invoice_no}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{i.agency?.name || "N/A"}</td>
                    <td className="px-5 py-3 text-slate-600">{i.date}</td>
                    <td className="px-5 py-3 text-slate-600 text-xs">{i.user?.name || "System"}</td>
                    <td className="px-5 py-3 text-right font-mono">{(Number(i.net_amount) || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-mono text-success-dark">{(Number(i.received_amount) || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => handlePrintInvoice(i)}>
                        <Printer className="mr-1 h-3.5 w-3.5" />Print
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {invoices.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border/60 p-4 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, invoices.length)} to {Math.min(currentPage * itemsPerPage, invoices.length)} of {invoices.length} entries
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

      {canAddPayment && (
        <div className="card-surface p-5 space-y-4">
          <h3 className="font-display text-base font-semibold">Record Payment</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Select Agency</Label>
              <Select value={payAgencyId} onValueChange={setPayAgencyId}>
                <SelectTrigger><SelectValue placeholder="Choose agency..." /></SelectTrigger>
                <SelectContent>
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Receive Amount (৳)</Label>
              <Input type="number" value={payAmount || ""} onChange={(e) => setPayAmount(Number(e.target.value))} />
            </div>

            {/* Smart outstanding dues notification helper block */}
            {payAgencyId && payAgencyId !== "all" && (
              <div className="md:col-span-2 flex items-center justify-between bg-teal-50 border border-teal-200 p-3 rounded-lg">
                <div className="text-xs text-slate-700">
                  Current outstanding balance for this agency: <strong className="text-destructive font-bold">৳ {Number(payAgencyDues).toLocaleString()}</strong>
                </div>
                {payAgencyDues > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-teal-600 hover:text-teal-700 p-0 h-auto text-xs font-semibold underline"
                    onClick={() => setPayAmount(payAgencyDues)}
                  >
                    Pay Full Dues
                  </Button>
                )}
              </div>
            )}

            <div>
              <Label>In Words</Label>
              <Input placeholder="Taka …" value={payWords} onChange={(e) => setPayWords(e.target.value)} />
            </div>
            <div>
              <Label>Month of Payment</Label>
              <Input type="month" value={payMonth} onChange={(e) => setPayMonth(e.target.value)} />
            </div>
          </div>
          <div className="pt-2 text-right">
            <Button
              className="gradient-primary"
              onClick={handleRecordPayment}
              disabled={recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              Submit
            </Button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
