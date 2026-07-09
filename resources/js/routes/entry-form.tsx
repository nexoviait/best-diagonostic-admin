import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Printer, FileText, CreditCard, Loader2, Search, QrCode, ShieldCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";

export const Route = createFileRoute("/entry-form")({ component: EntryFormPage });

const sideActions = [
  { label: "New Entry", icon: FileText },
  { label: "Card Front", icon: CreditCard },
  { label: "Card Back", icon: CreditCard },
  { label: "Report", icon: FileText },
  { label: "X-Ray Report", icon: FileText },
  { label: "Invoice", icon: FileText },
  { label: "Label Print", icon: Printer },
];

function BarcodePreview({ value, displayValue = false, height = 22 }: { value: string; displayValue?: boolean; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 1.5,
          height: height,
          displayValue: displayValue,
          fontSize: 10,
          margin: 0,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [value, displayValue, height]);

  return <svg ref={svgRef} className="mx-auto" style={{ maxHeight: displayValue ? "45px" : "28px" }} />;
}




function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

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

function EntryFormPage() {
  const [activeTab, setActiveTab] = useState("New Entry");
  const [activePatient, setActivePatient] = useState<any>(null);
  const [searchPaxId, setSearchPaxId] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const labelCount = 1;

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [countryId, setCountryId] = useState("");
  const [nationality, setNationality] = useState("BANGLADESH");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [mobileNo, setMobileNo] = useState("880");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [visaNo, setVisaNo] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [jobApplied, setJobApplied] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [mrId, setMrId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fingerprintFile, setFingerprintFile] = useState<File | null>(null);

  // Financials
  const [medicalFee, setMedicalFee] = useState(3500);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [niddleCharge, setNiddleCharge] = useState(0);
  const [inWords, setInWords] = useState("Three Thousand Five Hundred Taka Only");

  // Load dropdown lists
  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ["countries"],
    queryFn: () => apiRequest("/countries"),
  });

  const { data: agencies = [] } = useQuery<any[]>({
    queryKey: ["agencies"],
    queryFn: () => apiRequest("/agencies"),
  });

  const { data: mrs = [] } = useQuery<any[]>({
    queryKey: ["mrs"],
    queryFn: () => apiRequest("/mrs"),
  });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canAddPatient = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('add_patient');
  const canPrintCard = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('print_patient_card');

  const dueAmount = Math.max(0, medicalFee - receivedAmount);

  useEffect(() => {
    setInWords(numberToWords(medicalFee));
  }, [medicalFee]);

  useEffect(() => {
    if (agencyId) {
      const selected = agencies.find((a) => String(a.id) === agencyId);
      if (selected && selected.price) {
        setMedicalFee(Number(selected.price));
      }
    }
  }, [agencyId, agencies]);

  // Populate form fields from a loaded patient object
  const populateForm = (p: any) => {
    setDate(p.date || new Date().toISOString().split("T")[0]);
    setCountryId(p.country_id ? String(p.country_id) : "");
    setNationality(p.nationality || "BANGLADESH");
    setFirstName(p.first_name || "");
    setLastName(p.last_name || "");
    setFatherName(p.father_name || "");
    setMotherName(p.mother_name || "");
    setMobileNo(p.mobile_no || "880");
    setDob(p.dob || "");
    setSex(p.sex || "");
    setPassportNo(p.passport_no || "");
    setVisaNo(p.visa_no || "");
    setIssueDate(p.issue_date || "");
    setJobApplied(p.job_applied || "");
    setAgencyId(p.agency_id ? String(p.agency_id) : "");
    setMrId(p.mr_id ? String(p.mr_id) : "");
    setMedicalFee(Number(p.medical_fee) || 3500);
    setReceivedAmount(Number(p.received_amount) || 0);
    setNiddleCharge(Number(p.niddle_charge) || 0);
    setInWords(p.in_words || numberToWords(Number(p.medical_fee) || 3500));
    setImageFile(null);
    setFingerprintFile(null);
    setIsEditing(true);
  };

  // Auto-load from sessionStorage if navigated from Database edit button
  useEffect(() => {
    const pendingPax = sessionStorage.getItem("entryform_load_pax");
    if (pendingPax) {
      sessionStorage.removeItem("entryform_load_pax");
      setSearchPaxId(pendingPax);
      // Trigger load
      (async () => {
        setSearchLoading(true);
        try {
          const data = await apiRequest(`/patients/${pendingPax}`);
          setActivePatient(data);
          populateForm(data);
          toast.success("Patient record loaded for editing.");
        } catch (err: any) {
          toast.error(err.message || "Patient not found.");
        } finally {
          setSearchLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Search Patient
  const handleSearch = async () => {
    if (!searchPaxId) {
      toast.error("Please enter a Patient PAX ID.");
      return;
    }
    setSearchLoading(true);
    try {
      const data = await apiRequest(`/patients/${searchPaxId}`);
      setActivePatient(data);
      populateForm(data);
      toast.success("Patient record loaded successfully.");
    } catch (err: any) {
      toast.error(err.message || "Patient not found.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Save (create) patient mutation
  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("/patients", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (res) => {
      const savedPatient = res.data || res;
      toast.success(`Patient entry created successfully! ID is ${savedPatient.pax_id}`);
      setActivePatient(savedPatient);
      setIsEditing(true);
      // Auto switch to Card Front tab to show details!
      setActiveTab("Card Front");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create patient entry.");
    },
  });

  // Update (edit) patient mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (imageFile || fingerprintFile) {
        // If there's a new image or fingerprint, use FormData with POST method override
        const formData = buildFormData();
        formData.append("_method", "PUT");
        return apiRequest(`/patients/${activePatient.id}`, {
          method: "POST",
          body: formData,
        });
      } else {
        // No file change, send JSON body with PUT
        return apiRequest(`/patients/${activePatient.id}`, {
          method: "PUT",
          body: JSON.stringify({
            date, country_id: countryId, nationality, first_name: firstName,
            last_name: lastName, father_name: fatherName, mother_name: motherName,
            mobile_no: mobileNo, dob, sex, passport_no: passportNo, visa_no: visaNo,
            issue_date: issueDate, job_applied: jobApplied, agency_id: agencyId,
            mr_id: mrId, medical_fee: medicalFee, received_amount: receivedAmount,
            niddle_charge: niddleCharge, in_words: inWords,
          }),
        });
      }
    },
    onSuccess: (res) => {
      const updatedPatient = res.data || res;
      setActivePatient(updatedPatient);
      toast.success(`Patient record updated successfully!`);
      setActiveTab("Card Front");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update patient entry.");
    },
  });

  const buildFormData = (): FormData => {
    const formData = new FormData();
    formData.append("date", date);
    formData.append("country_id", countryId);
    formData.append("nationality", nationality);
    formData.append("first_name", firstName);
    formData.append("last_name", lastName || "");
    formData.append("father_name", fatherName || "");
    formData.append("mother_name", motherName || "");
    formData.append("mobile_no", mobileNo);
    formData.append("dob", dob || "");
    formData.append("sex", sex || "");
    formData.append("passport_no", passportNo || "");
    formData.append("visa_no", visaNo || "");
    formData.append("issue_date", issueDate || "");
    formData.append("job_applied", jobApplied || "");
    formData.append("agency_id", agencyId);
    formData.append("mr_id", mrId);
    formData.append("medical_fee", String(medicalFee));
    formData.append("received_amount", String(receivedAmount));
    formData.append("due_amount", String(dueAmount));
    formData.append("niddle_charge", String(niddleCharge));
    formData.append("in_words", inWords);
    if (imageFile) {
      formData.append("image", imageFile);
    }
    if (fingerprintFile) {
      formData.append("fingerprint", fingerprintFile);
    }
    return formData;
  };

  const handleSave = () => {
    if (!firstName || !countryId || !agencyId || !mrId) {
      toast.error("Please fill in required fields (First Name, Country, Agency, MR).");
      return;
    }
    if (isEditing && activePatient) {
      updateMutation.mutate();
    } else {
      const formData = buildFormData();
      saveMutation.mutate(formData);
    }
  };

  const handleNewEntry = () => {
    setActivePatient(null);
    setIsEditing(false);
    setSearchPaxId("");
    setDate(new Date().toISOString().split("T")[0]);
    setCountryId(""); setNationality("BANGLADESH"); setFirstName("");
    setLastName(""); setFatherName(""); setMotherName("");
    setMobileNo("880"); setDob(""); setSex(""); setPassportNo("");
    setVisaNo(""); setIssueDate(""); setJobApplied("");
    setAgencyId(""); setMrId(""); setImageFile(null); setFingerprintFile(null);
    setMedicalFee(3500); setReceivedAmount(0); setNiddleCharge(0);
    setInWords("Three Thousand Five Hundred Taka Only");
    setActiveTab("New Entry");
  };

  const handlePrint = () => {
    if (!activePatient) {
      toast.error("Please load or select a patient first.");
      return;
    }

    if (activeTab === "New Entry") {
      toast.error("Please select a document tab (e.g. Card Front, Report, Invoice) to print.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let html = "";

    if (activeTab === "Card Front") {
      html = `
        <html>
        <head>
          <title>Card Front - ${activePatient.pax_id}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
            .card {
              width: 380px;
              height: 240px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .accent {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 8px;
              background: linear-gradient(135deg, oklch(0.58 0.14 180), oklch(0.72 0.13 180));
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: start;
              margin-top: 4px;
            }
            .company {
              margin: 0;
              font-weight: bold;
              font-size: 14px;
              color: oklch(0.58 0.14 180);
            }
            .address {
              margin: 0;
              font-size: 10px;
              color: #64748b;
            }
            .status {
              font-size: 9px;
              font-weight: bold;
              background: rgba(22, 163, 74, 0.1);
              color: rgb(22, 163, 74);
              border: 1px solid rgba(22, 163, 74, 0.2);
              padding: 2px 6px;
              border-radius: 4px;
              text-transform: uppercase;
            }
            .body {
              display: flex;
              gap: 12px;
              margin-top: 12px;
              align-items: center;
              flex: 1;
            }
            .photo {
              width: 80px;
              height: 96px;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: #94a3b8;
              background: #f8fafc;
              object-fit: cover;
            }
            .details {
              font-size: 12px;
              line-height: 1.5;
              color: #0f172a;
            }
            .value { font-weight: 600; }
            .pax {
              font-family: monospace;
              font-weight: bold;
              color: oklch(0.58 0.14 180);
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 8px;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card">
            <div class="accent"></div>
            <div class="header">
              <div>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                  <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 24px; object-fit: contain;" />
                  <span style="font-weight: bold; font-size: 11px; color: #0d9488;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                </div>
                <p class="address">${user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
              </div>
              <span class="status">${activePatient.medical_report?.final_status || "FIT"}</span>
            </div>
            <div class="body">
              ${activePatient.image_url ?
          `<img class="photo" src="${activePatient.image_url}" />` :
          `<div class="photo">NO PHOTO</div>`
        }
              <div class="details">
                <div><span class="label">PAX ID:</span> <span class="pax">${activePatient.pax_id}</span></div>
                <div><span class="label">Name:</span> <span class="value">${activePatient.first_name} ${activePatient.last_name || ''}</span></div>
                <div><span class="label">Passport:</span> <span class="value" style="font-family: monospace;">${activePatient.passport_no || 'N/A'}</span></div>
                <div><span class="label">Country:</span> <span class="value">${activePatient.country?.name || 'MALAYSIA'}</span></div>
              </div>
            </div>
            <div class="footer">
              <span>Issue Date: ${activePatient.date}</span>
              <svg style="width:24px; height:24px; color:#334155" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16V21H16"/><path d="M21 16H16V21"/><path d="M9 9h.01"/><path d="M9 15h.01"/><path d="M15 9h.01"/><path d="M15 15h.01"/></svg>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (activeTab === "Card Back") {
      html = `
        <html>
        <head>
          <title>Card Back - ${activePatient.pax_id}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
            .card {
              width: 380px;
              height: 240px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .header {
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 8px;
            }
            .title {
              margin: 0;
              font-weight: bold;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #0f172a;
            }
            .body {
              font-size: 9px;
              color: #475569;
              line-height: 1.6;
              display: flex;
              flex-direction: column;
              justify-content: center;
              flex: 1;
              padding: 16px 0;
              text-align: left;
            }
            .body p {
              margin: 4px 0;
            }
            .footer {
              border-top: 1px solid #f1f5f9;
              padding-top: 8px;
              font-size: 9px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card">
            <div class="header">
              <h4 class="title">Terms & Conditions</h4>
            </div>
            <div class="body">
              <p>1. This card certifies the medical clearance status of the cardholder at the time of check-up.</p>
              <p>2. Any modification or tempering of this card will invalidate the medical clearance.</p>
              <p>3. Scan the QR code on the front to verify the digital report authenticity.</p>
            </div>
            <div class="footer">
              Hotline: ${user?.company_phone_en || "+880-2-9876543"} | Web: ${user?.email || "www.bestdiagnostic.com"}
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (activeTab === "Report") {
      html = `
        <html>
        <head>
          <title>Medical Report - ${activePatient.pax_id}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; gap: 16px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: bold; color: oklch(0.58 0.14 180); }
            .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; gap: 4px; }
            .report-title-section h3 { margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; color: #0f172a; }
            .report-title-section p { margin: 4px 0 0; font-size: 12px; font-family: monospace; color: #64748b; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 12px; margin-bottom: 24px; }
            .meta-column p { margin: 6px 0; }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th, td { padding: 10px 16px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0; color: #475569; }
            td { border-bottom: 1px solid #f1f5f9; }
            tr:last-child td { border-bottom: none; }
            .result-success { font-weight: 600; color: rgb(22, 163, 74); }
            .footer-section { display: flex; justify-content: space-between; align-items: center; margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 24px; font-size: 12px; }
            .status { font-weight: bold; color: rgb(22, 163, 74); text-transform: uppercase; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 160px; padding-top: 6px; font-size: 10px; color: #64748b; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="try { JsBarcode(document.querySelector('.barcode-svg'), '${activePatient.pax_id}', { format: 'CODE128', width: 1.2, height: 24, displayValue: false, margin: 0 }); } catch(e) {} setTimeout(function() { window.print(); window.close(); }, 300);">
          <div class="header">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 36px; object-fit: contain;" />
                <span style="font-weight: bold; font-size: 16px; color: #0d9488;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
              </div>
              <p>${user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"} | Phone: ${user?.company_phone_en || "+8801756441699"}</p>
            </div>
            <div class="report-title-section" style="text-align: right; display: flex; flex-direction: column; align-items: end; gap: 4px; shrink-0;">
              <h3>MEDICAL CLEARANCE REPORT</h3>
              <p style="margin: 0; font-size: 12px; font-family: monospace;">ID: ${activePatient.pax_id}</p>
              <svg class="barcode-svg" data-pax="${activePatient.pax_id}"></svg>
            </div>
            <img src="${activePatient.image_url || '/assets/images/best-logo.png'}" onerror="this.src='/assets/images/best-logo.png'" style="width: 64px; height: 80px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; shrink-0;" />
          </div>
          <div class="meta-grid">
            <div class="meta-column">
              <p><span class="label">Patient Name:</span> <span class="value">${activePatient.first_name} ${activePatient.last_name || ''}</span></p>
              <p><span class="label">Father's Name:</span> <span class="value">${activePatient.father_name || 'N/A'}</span></p>
              <p><span class="label">Passport No:</span> <span class="value" style="font-family: monospace;">${activePatient.passport_no || 'N/A'}</span></p>
            </div>
            <div class="meta-column">
              <p><span class="label">Date:</span> <span class="value">${activePatient.date}</span></p>
              <p><span class="label">Country:</span> <span class="value">${activePatient.country?.name || 'MALAYSIA'}</span></p>
              <p><span class="label">Agency:</span> <span class="value">${activePatient.agency?.name || 'N/A'}</span></p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Laboratory Findings</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>HIV 1 & 2 Antibody</td><td class="result-success">Negative</td></tr>
              <tr><td>HBsAg (Hepatitis B)</td><td class="result-success">Negative</td></tr>
              <tr><td>Anti-HCV (Hepatitis C)</td><td class="result-success">Negative</td></tr>
              <tr><td>VDRL / TPHA</td><td class="result-success">Negative</td></tr>
              <tr><td>Chest X-Ray Examination</td><td class="result-success">Normal Findings</td></tr>
            </tbody>
          </table>
          <div class="footer-section">
            <div>
              <span class="label">STATUS:</span> <span class="status">${activePatient.medical_report?.final_status || 'FIT'}</span>
            </div>
            <div class="signature">Authorized Medical Officer</div>
          </div>
        </body>
        </html>
      `;
    } else if (activeTab === "X-Ray Report") {
      html = `
        <html>
        <head>
          <title>X-Ray Report - ${activePatient.pax_id}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; gap: 16px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: bold; color: oklch(0.58 0.14 180); }
            .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; gap: 4px; }
            .report-title-section h3 { margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; color: #0f172a; }
            .report-title-section p { margin: 4px 0 0; font-size: 12px; font-family: monospace; color: #64748b; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; }
            .meta-column p { margin: 6px 0; }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            .findings-section { font-size: 12px; margin-bottom: 32px; }
            .findings-section h4 { margin: 16px 0 6px; font-weight: bold; color: #334155; }
            .findings-section p { margin: 0; line-height: 1.6; color: #475569; }
            .impression { font-weight: 600; color: rgb(22, 163, 74); }
            .footer-section { display: flex; justify-content: flex-end; margin-top: 64px; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 160px; padding-top: 6px; font-size: 10px; color: #64748b; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="try { JsBarcode(document.querySelector('.barcode-svg'), '${activePatient.pax_id}', { format: 'CODE128', width: 1.2, height: 24, displayValue: false, margin: 0 }); } catch(e) {} setTimeout(function() { window.print(); window.close(); }, 300);">
          <div class="header">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 36px; object-fit: contain;" />
                <span style="font-weight: bold; font-size: 16px; color: #0d9488;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
              </div>
              <p>Radiology & Chest Diagnostics Department</p>
            </div>
            <div class="report-title-section" style="text-align: right; display: flex; flex-direction: column; align-items: end; gap: 4px; shrink-0;">
              <h3>CHEST ROENTGENOGRAM REPORT</h3>
              <p style="margin: 0; font-size: 12px; font-family: monospace;">ID: ${activePatient.pax_id}</p>
              <svg class="barcode-svg" data-pax="${activePatient.pax_id}"></svg>
            </div>
            <img src="${activePatient.image_url || '/assets/images/best-logo.png'}" onerror="this.src='/assets/images/best-logo.png'" style="width: 64px; height: 80px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; shrink-0;" />
          </div>
          <div class="meta-grid">
            <div class="meta-column">
              <p><span class="label">Patient:</span> <span class="value">${activePatient.first_name} ${activePatient.last_name || ''}</span></p>
              <p><span class="label">Passport:</span> <span class="value" style="font-family: monospace;">${activePatient.passport_no || 'N/A'}</span></p>
            </div>
            <div class="meta-column">
              <p><span class="label">X-Ray Date:</span> <span class="value">${activePatient.date}</span></p>
              <p><span class="label">Position:</span> <span class="value">PA View</span></p>
            </div>
          </div>
          <div class="findings-section">
            <h4>CHEST FINDINGS:</h4>
            <p>${activePatient.xray_report?.chest_remarks || 'Lungs are clear. Both hilar shadows are normal. Heart and mediastinal shadows are within normal configurations. Diaphragm and both costophrenic angles are normal. Bony thorax is normal.'}</p>
            
            <h4>IMPRESSION:</h4>
            <p class="impression">${activePatient.xray_report?.chest_status || 'NORMAL CHEST X-RAY FINDINGS.'}</p>
          </div>
          <div class="footer-section">
            ${user?.signature_radiologist_path ? 
              `<div class="signature" style="border-top: none;"><img src="${user.signature_radiologist_path}" style="height: 36px; object-fit: contain; display: block; margin: 0 auto 4px auto;" />Radiologist Signature</div>` : 
              `<div class="signature">Radiologist Signature</div>`
            }
          </div>
        </body>
        </html>
      `;
    } else if (activeTab === "Invoice") {
      html = `
        <html>
        <head>
          <title>Invoice - ${activePatient.pax_id}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; gap: 16px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: bold; color: oklch(0.58 0.14 180); }
            .header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; }
            .report-title-section h3 { margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; color: #0f172a; }
            .report-title-section p { margin: 4px 0 0; font-size: 12px; font-family: monospace; color: #64748b; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; }
            .meta-column p { margin: 6px 0; }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th, td { padding: 10px 16px; }
            th { background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: left; }
            td { border-bottom: 1px solid #f1f5f9; text-align: left; }
            .text-right { text-align: right; }
            tr:last-child td { border-bottom: none; }
            .total-row { font-weight: 600; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
            .success-row { font-weight: 600; color: rgb(22, 163, 74); }
            .destructive-row { font-weight: 600; color: rgb(220, 38, 38); }
            .in-words-section { font-size: 12px; margin-top: 16px; font-style: italic; }
            .in-words-section span { font-style: normal; color: #64748b; }
            .footer-section { display: flex; justify-content: space-between; align-items: end; margin-top: 64px; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 160px; padding-top: 6px; font-size: 10px; color: #64748b; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="initBarcode()">
          <div class="header">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 36px; object-fit: contain;" />
                <span style="font-weight: bold; font-size: 16px; color: #0d9488;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
              </div>
              <p>${user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
            </div>
            <div class="report-title-section" style="display: flex; flex-direction: column; align-items: flex-end; shrink-0;">
              <h3>PAYMENT RECEIPT</h3>
              <p style="margin-bottom: 6px; margin-top: 4px; font-size: 12px; color: #64748b;">Invoice Date: ${activePatient.date}</p>
              <svg id="invoice-barcode"></svg>
            </div>
            <img src="${activePatient.image_url || '/assets/images/best-logo.png'}" onerror="this.src='/assets/images/best-logo.png'" style="width: 64px; height: 80px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; shrink-0;" />
          </div>
          <div class="meta-grid">
            <div class="meta-column">
              <p><span class="label">Received From:</span> <span class="value">${activePatient.first_name} ${activePatient.last_name || ''}</span></p>
              <p><span class="label">Patient ID:</span> <span class="value" style="font-family: monospace;">${activePatient.pax_id}</span></p>
            </div>
            <div class="meta-column">
              <p><span class="label">Agency:</span> <span class="value">${activePatient.agency?.name || 'N/A'}</span></p>
              <p><span class="label">Representative:</span> <span class="value">${activePatient.mr?.name || 'N/A'}</span></p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Amount (৳)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Medical Check-up Registration & Report fee</td>
                <td class="text-right">${(Number(activePatient.medical_fee) || 0).toLocaleString()}</td>
              </tr>
              ${Number(activePatient.niddle_charge) > 0 ? `
              <tr>
                <td>Needle Charge</td>
                <td class="text-right">${(Number(activePatient.niddle_charge) || 0).toLocaleString()}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td>Total Amount Due</td>
                <td class="text-right">${(Number(activePatient.medical_fee) + (Number(activePatient.niddle_charge) || 0)).toLocaleString()}</td>
              </tr>
              <tr class="success-row">
                <td>Amount Paid</td>
                <td class="text-right">${(Number(activePatient.received_amount) || 0).toLocaleString()}</td>
              </tr>
              <tr class="destructive-row">
                <td>Dues Outstanding</td>
                <td class="text-right">${(Number(activePatient.due_amount) || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <div class="in-words-section">
            <span>In Words:</span> ${activePatient.in_words || numberToWords(Number(activePatient.medical_fee))}
          </div>
          <div class="footer-section">
            ${user?.signature_authorised_path ? 
              `<div class="signature" style="border-top: none; margin-left: auto;"><img src="${user.signature_authorised_path}" style="height: 36px; object-fit: contain; display: block; margin: 0 auto 4px auto;" />Operator / Cashier</div>` : 
              `<div class="signature" style="margin-left: auto;">Operator / Cashier</div>`
            }
          </div>
          <script>
            function initBarcode() {
              try {
                JsBarcode('#invoice-barcode', '${activePatient.pax_id}', {
                  format: 'CODE128',
                  width: 1.5,
                  height: 30,
                  displayValue: true,
                  fontSize: 10,
                  margin: 0
                });
              } catch(e) {
                console.error(e);
              }
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            }
          </script>
        </body>
        </html>
      `;
    } else if (activeTab === "Label Print") {
      const paxId = activePatient.pax_id;
      const name = `${activePatient.first_name} ${activePatient.last_name || ''}`.toUpperCase().trim();
      const dateStr = activePatient.date || '';

      const pageWidth = '40mm';
      const pageHeight = '30mm';

      html = `<!DOCTYPE html>
      <html>
      <head>
        <title>Label - ${paxId}</title>
        <style>
          @page {
            size: ${pageWidth} ${pageHeight};
            margin: 0;
          }
          /* Enforce 100% bounds and hide any overflow to prevent the blank second page */
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            font-family: Arial, sans-serif;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
            }
            .label-page {
              margin: 0 !important;
              padding: 0 !important;
            }
          }
          .label-page {
            position: relative;
            width: ${pageWidth};
            height: ${pageHeight};
            page-break-after: always;
            box-sizing: border-box;
            overflow: hidden;
          }
          .label-page:last-child {
            page-break-after: avoid;
          }
          
          /* The 0x0 anchor hides the unrotated 38mm height from Chrome's pagination engine to prevent layout shift bugs */
          .label-center-anchor {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
          }
          
          .label-content {
            position: absolute;
            width: 28mm;
            height: 38mm;
            transform: translate(-50%, -50%) rotate(90deg);
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            padding-bottom: 1.5mm;
          }
          
          /* Smart Label Styles (tightened margins/font to ensure safe fit) */
          .smart-name { font-size: 13px; font-weight: bold; margin-bottom: 3px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;}
          .smart-date { font-size: 10px; margin-bottom: 5px; text-align: center; color: #000;}

          .barcode-container {
            display: flex;
            justify-content: center;
            width: 100%;
          }
          svg {
            max-width: 100%;
            height: auto;
            shape-rendering: crispEdges; /* Prevents browser anti-aliasing blur on barcode lines */
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>${Array.from({ length: labelCount }).map(() => `
<div class="label-page">
  <div class="label-center-anchor">
    <div class="label-content">
      <div class="smart-name">${name.substring(0, 25)}</div>
      <div class="smart-date">Date: ${dateStr}</div>
      <div class="barcode-container">
        <svg class="barcode-svg" data-pax="${paxId}"></svg>
      </div>
    </div>
  </div>
</div>
      `.trim()).join('')}
        <script>
          window.onload = function() {
            try {
              document.querySelectorAll('.barcode-svg').forEach(function(el) {
                const code = el.getAttribute('data-pax');
                JsBarcode(el, code, {
                  format: 'CODE128',
                  width: 1.2,
                  height: 38,
                  displayValue: true,
                  fontSize: 9,
                  margin: 0
                });
              });
            } catch(e) {
              console.error('barcode error', e);
            }
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
      </html>`;
    }

    if (html) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <DashboardShell title="Entry Form" subtitle="Register patient entries and preview documents.">
      {/* Top search bar to load existing records */}
      <div className="card-surface p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Active Patient:</Label>
          <span className="font-semibold text-primary font-mono">
            {activePatient ? `${activePatient.first_name} (${activePatient.pax_id})` : "None (Register new or search)"}
          </span>
          {isEditing && (
            <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground uppercase tracking-wide">Edit Mode</span>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <Button size="sm" variant="outline" onClick={handleNewEntry}>
              + New Entry
            </Button>
          )}
          <Input
            placeholder="Search by ID (e.g. BEST000001)"
            className="w-56 h-8 text-xs"
            value={searchPaxId}
            onChange={(e) => setSearchPaxId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button size="sm" onClick={handleSearch} disabled={searchLoading}>
            {searchLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            Load
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar Actions */}
        <aside className="card-surface min-w-0 p-3 h-fit space-y-3">
          <div className="space-y-1">
            {sideActions.map((a) => {
              const isActive = activeTab === a.label;
              return (
                <Button
                  key={a.label}
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${isActive ? "gradient-primary text-white" : ""}`}
                  onClick={() => setActiveTab(a.label)}
                >
                  <a.icon className="mr-2 h-4 w-4" />
                  {a.label}
                </Button>
              );
            })}
          </div>
          {activePatient && (
            <div className="flex flex-wrap gap-2">
              {canPrintCard && (
                <Button className="gradient-primary shadow-md" onClick={handlePrint} disabled={!activePatient}>
                  <Printer className="mr-2 h-4 w-4" /> Print Document
                </Button>
              )}
            </div>
          )}
        </aside>

        {/* Content Panel */}
        <div className="card-surface min-w-0 p-6">

          {/* TAB 1: New Entry registration form */}
          {activeTab === "New Entry" && (
            <div>
              <h3 className="font-display text-base font-semibold mb-4">Patient Medical Registration</h3>
              <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                <Field label="Date">
                  <DatePicker value={date} onChange={setDate} />
                </Field>
                <Field label="Patient ID">
                  <Input placeholder={isEditing && activePatient ? activePatient.pax_id : "Auto Generated"} disabled />
                </Field>

                <Field label="Country">
                  <Select value={countryId} onValueChange={setCountryId}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Nationality">
                  <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
                </Field>
                <Field label="First Name">
                  <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </Field>
                <Field label="Last Name">
                  <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </Field>
                <Field label="Father's Name">
                  <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
                </Field>
                <Field label="Mother's Name">
                  <Input value={motherName} onChange={(e) => setMotherName(e.target.value)} />
                </Field>
                <Field label="Mobile No">
                  <Input value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} />
                </Field>
                <Field label="Date of Birth">
                  <DatePicker value={dob} onChange={setDob} />
                </Field>

                <Field label="Sex">
                  <Select value={sex} onValueChange={setSex}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Passport No">
                  <Input value={passportNo} onChange={(e) => setPassportNo(e.target.value)} />
                </Field>
                <Field label="Visa No">
                  <Input value={visaNo} onChange={(e) => setVisaNo(e.target.value)} />
                </Field>
                <Field label="Issue Date">
                  <DatePicker value={issueDate} onChange={setIssueDate} />
                </Field>
                <Field label="Job Applied">
                  <Input value={jobApplied} onChange={(e) => setJobApplied(e.target.value)} />
                </Field>

                <Field label="Agency">
                  <Select value={agencyId} onValueChange={setAgencyId}>
                    <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                    <SelectContent>
                      {agencies.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="MR">
                  <Select value={mrId} onValueChange={setMrId}>
                    <SelectTrigger><SelectValue placeholder="Select MR" /></SelectTrigger>
                    <SelectContent>
                      {mrs.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Image">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                </Field>

                <Field label="Fingerprint">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFingerprintFile(e.target.files?.[0] || null)}
                  />
                </Field>
              </div>

              <div className="mt-8 grid gap-x-8 gap-y-4 border-t border-border/60 pt-6 md:grid-cols-2">
                <Field label="Medical Fee">
                  <Input type="number" value={medicalFee} onChange={(e) => setMedicalFee(Number(e.target.value))} />
                </Field>
                <Field label="Received">
                  <Input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(Number(e.target.value))} />
                </Field>
                <Field label="Dues">
                  <Input type="number" value={dueAmount} disabled />
                </Field>
                <Field label="Needle Charge">
                  <Input type="number" value={niddleCharge} onChange={(e) => setNiddleCharge(Number(e.target.value))} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="In Words">
                    <Input placeholder="Amount in words…" value={inWords} onChange={(e) => setInWords(e.target.value)} />
                  </Field>
                </div>
              </div>

              {canAddPatient && (
                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    className="gradient-primary"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || updateMutation.isPending}
                  >
                    {(saveMutation.isPending || updateMutation.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    {isEditing ? "Update entry" : "Save entry"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Card Front template */}
          {activeTab === "Card Front" && (
            <div className="flex flex-col items-center p-6">
              {activePatient ? (
                <div className="w-[380px] h-[240px] rounded-xl border border-slate-200 bg-white text-slate-900 shadow-md p-4 flex flex-col justify-between font-sans relative overflow-hidden">
                  {/* Neon top accent */}
                  <div className="absolute top-0 left-0 w-full h-2 gradient-primary" />

                  <div className="flex justify-between items-start pt-2">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1.5 mb-1">
                        <img src={user?.logo_path || "/assets/images/best-logo.png"} alt="Logo" className="h-6 object-contain" />
                        <span className="font-bold text-[10px] text-primary leading-none">{user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-tight">{user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-success/10 text-success font-semibold border border-success/20 uppercase">
                      {activePatient.medical_report?.final_status || "FIT"}
                    </span>
                  </div>

                  <div className="flex gap-3 my-2 flex-1 items-center">
                    <div className="w-20 h-24 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 overflow-hidden shrink-0">
                      {activePatient.image_url ? (
                        <img src={activePatient.image_url} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        "NO PHOTO"
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <p><span className="text-slate-500">PAX ID:</span> <span className="font-mono font-bold text-primary">{activePatient.pax_id}</span></p>
                      <p><span className="text-slate-500">Name:</span> <span className="font-semibold">{activePatient.first_name} {activePatient.last_name || ""}</span></p>
                      <p><span className="text-slate-500">Passport:</span> <span className="font-mono">{activePatient.passport_no || "N/A"}</span></p>
                      <p><span className="text-slate-500">Country:</span> <span>{activePatient.country?.name || "MALAYSIA"}</span></p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                    <div>
                      <p>Issue Date: {activePatient.date}</p>
                    </div>
                    <QrCode className="h-6 w-6 text-slate-700" />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">Please load or register a patient first.</p>
              )}
            </div>
          )}

          {/* TAB 3: Card Back template */}
          {activeTab === "Card Back" && (
            <div className="flex flex-col items-center p-6">
              {activePatient ? (
                <div className="w-[380px] h-[240px] rounded-xl border border-slate-200 bg-white text-slate-900 shadow-md p-4 flex flex-col justify-between font-sans text-center">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-[11px] uppercase tracking-wide">Terms & Conditions</h4>
                  </div>
                  <div className="text-[9px] text-slate-600 space-y-2 flex-1 py-4 flex flex-col justify-center">
                    <p>1. This card certifies the medical clearance status of the cardholder at the time of check-up.</p>
                    <p>2. Any modification or tempering of this card will invalidate the medical clearance.</p>
                    <p>3. Scan the QR code on the front to verify the digital report authenticity.</p>
                  </div>
                  <div className="border-t border-slate-100 pt-2 text-[9px] text-slate-400">
                    <p>Hotline: {user?.company_phone_en || "+880-2-9876543"} | Web: {user?.email || "www.bestdiagnostic.com"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">Please load or register a patient first.</p>
              )}
            </div>
          )}

          {/* TAB 4: Medical Report template */}
          {activeTab === "Report" && (
            <div className="p-4 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-6 font-sans">
              {activePatient ? (
                <>
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={user?.logo_path || "/assets/images/best-logo.png"} alt="Logo" className="h-9 object-contain" />
                        <span className="font-bold text-sm text-primary">{user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                      </div>
                      <p className="text-xs text-slate-500">{user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"} | Phone: {user?.company_phone_en || "+8801756441699"}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <h3 className="font-bold text-sm">MEDICAL CLEARANCE REPORT</h3>
                      <p className="text-xs text-slate-500 font-mono">ID: {activePatient.pax_id}</p>
                      <div className="h-6">
                        <BarcodePreview value={activePatient.pax_id} displayValue={false} height={20} />
                      </div>
                    </div>
                    <div className="w-16 h-20 border border-slate-200 rounded overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                      {activePatient.image_url ? (
                        <img src={activePatient.image_url} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] text-slate-400">NO PHOTO</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p><span className="text-slate-500">Patient Name:</span> <span className="font-semibold">{activePatient.first_name} {activePatient.last_name || ""}</span></p>
                      <p><span className="text-slate-500">Father's Name:</span> <span>{activePatient.father_name || "N/A"}</span></p>
                      <p><span className="text-slate-500">Passport No:</span> <span className="font-mono font-semibold">{activePatient.passport_no || "N/A"}</span></p>
                    </div>
                    <div>
                      <p><span className="text-slate-500">Date:</span> <span>{activePatient.date}</span></p>
                      <p><span className="text-slate-500">Country:</span> <span>{activePatient.country?.name || "MALAYSIA"}</span></p>
                      <p><span className="text-slate-500">Agency:</span> <span>{activePatient.agency?.name || "N/A"}</span></p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-left">
                          <th className="px-4 py-2 font-semibold">Laboratory Findings</th>
                          <th className="px-4 py-2 font-semibold">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr><td className="px-4 py-1.5 font-medium">HIV 1 & 2 Antibody</td><td className="px-4 py-1.5 text-success font-semibold">Negative</td></tr>
                        <tr><td className="px-4 py-1.5 font-medium">HBsAg (Hepatitis B)</td><td className="px-4 py-1.5 text-success font-semibold">Negative</td></tr>
                        <tr><td className="px-4 py-1.5 font-medium">Anti-HCV (Hepatitis C)</td><td className="px-4 py-1.5 text-success font-semibold">Negative</td></tr>
                        <tr><td className="px-4 py-1.5 font-medium">VDRL / TPHA</td><td className="px-4 py-1.5 text-success font-semibold">Negative</td></tr>
                        <tr><td className="px-4 py-1.5 font-medium">Chest X-Ray Examination</td><td className="px-4 py-1.5 text-success font-semibold">Normal Findings</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-8 border-t border-slate-100 text-xs">
                    <div>
                      <p className="font-semibold uppercase text-success flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4" /> STATUS: {activePatient.medical_report?.final_status || "FIT"}
                      </p>
                    </div>
                    <div className="text-center w-40 border-t border-slate-300 pt-2 text-[10px] text-slate-500">
                      Authorized Medical Officer
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-12">Please load or register a patient first.</p>
              )}
            </div>
          )}

          {/* TAB 5: X-Ray Report template */}
          {activeTab === "X-Ray Report" && (
            <div className="p-4 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-6 font-sans">
              {activePatient ? (
                <>
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={user?.logo_path || "/assets/images/best-logo.png"} alt="Logo" className="h-9 object-contain" />
                        <span className="font-bold text-sm text-primary">{user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Radiology & Chest Diagnostics Department</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <h3 className="font-bold text-sm">CHEST ROENTGENOGRAM REPORT</h3>
                      <p className="text-xs text-slate-500 font-mono">ID: {activePatient.pax_id}</p>
                      <div className="h-6">
                        <BarcodePreview value={activePatient.pax_id} displayValue={false} height={20} />
                      </div>
                    </div>
                    <div className="w-16 h-20 border border-slate-200 rounded overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                      {activePatient.image_url ? (
                        <img src={activePatient.image_url} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] text-slate-400">NO PHOTO</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-4">
                    <p><span className="text-slate-500">Patient:</span> <span className="font-semibold">{activePatient.first_name} {activePatient.last_name || ""}</span></p>
                    <p><span className="text-slate-500">Passport:</span> <span className="font-mono">{activePatient.passport_no || "N/A"}</span></p>
                    <p><span className="text-slate-500">X-Ray Date:</span> <span>{activePatient.date}</span></p>
                    <p><span className="text-slate-500">Position:</span> <span>PA View</span></p>
                  </div>

                  <div className="text-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-700">CHEST FINDINGS:</h4>
                      <p className="mt-1 text-slate-600 leading-relaxed">
                        {activePatient.xray_report?.chest_remarks ||
                          "Lungs are clear. Both hilar shadows are normal. Heart and mediastinal shadows are within normal configurations. Diaphragm and both costophrenic angles are normal. Bony thorax is normal."}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-700">IMPRESSION:</h4>
                      <p className="mt-1 text-success font-semibold">
                        {activePatient.xray_report?.chest_status || "NORMAL CHEST X-RAY FINDINGS."}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 text-xs">
                    <div className="text-center w-40 border-t border-slate-300 pt-2 text-[10px] text-slate-500 flex flex-col items-center">
                      {user?.signature_radiologist_path && (
                        <img src={user.signature_radiologist_path} className="h-10 w-auto object-contain mb-1" alt="Radiologist Signature" />
                      )}
                      <span>Radiologist Signature</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-12">Please load or register a patient first.</p>
              )}
            </div>
          )}

          {/* TAB 6: Invoice receipt template */}
          {activeTab === "Invoice" && (
            <div className="p-4 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-6 font-sans">
              {activePatient ? (
                <>
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={user?.logo_path || "/assets/images/best-logo.png"} alt="Logo" className="h-9 object-contain" />
                        <span className="font-bold text-sm text-primary">{user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
                    </div>
                    <div className="text-right text-xs flex flex-col items-end gap-1 shrink-0">
                      <h3 className="font-bold text-sm">PAYMENT RECEIPT</h3>
                      <p className="font-mono text-xs text-slate-500 mb-1">Invoice Date: {activePatient.date}</p>
                      <BarcodePreview value={activePatient.pax_id} displayValue={true} height={30} />
                    </div>
                    <div className="w-16 h-20 border border-slate-200 rounded overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                      {activePatient.image_url ? (
                        <img src={activePatient.image_url} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] text-slate-400">NO PHOTO</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-4">
                    <div>
                      <p><span className="text-slate-500">Received From:</span> <span className="font-semibold">{activePatient.first_name} {activePatient.last_name || ""}</span></p>
                      <p><span className="text-slate-500">Patient ID:</span> <span className="font-mono font-semibold">{activePatient.pax_id}</span></p>
                    </div>
                    <div>
                      <p><span className="text-slate-500">Agency:</span> <span>{activePatient.agency?.name || "N/A"}</span></p>
                      <p><span className="text-slate-500">Representative:</span> <span>{activePatient.mr?.name || "N/A"}</span></p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200 text-left">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Description</th>
                          <th className="px-4 py-2 text-right font-semibold">Amount (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-4 py-2">Medical Check-up Registration & Report fee</td>
                          <td className="px-4 py-2 text-right">{(Number(activePatient.medical_fee) || 0).toLocaleString()}</td>
                        </tr>
                        {Number(activePatient.niddle_charge) > 0 && (
                          <tr>
                            <td className="px-4 py-2">Needle Charge</td>
                            <td className="px-4 py-2 text-right">{(Number(activePatient.niddle_charge) || 0).toLocaleString()}</td>
                          </tr>
                        )}
                        <tr className="font-semibold bg-slate-50 border-t border-slate-200">
                          <td className="px-4 py-2">Total Amount Due</td>
                          <td className="px-4 py-2 text-right">{(Number(activePatient.medical_fee) + (Number(activePatient.niddle_charge) || 0)).toLocaleString()}</td>
                        </tr>
                        <tr className="font-semibold text-success">
                          <td className="px-4 py-2">Amount Paid</td>
                          <td className="px-4 py-2 text-right">{(Number(activePatient.received_amount) || 0).toLocaleString()}</td>
                        </tr>
                        <tr className="font-semibold text-destructive">
                          <td className="px-4 py-2">Dues Outstanding</td>
                          <td className="px-4 py-2 text-right">{(Number(activePatient.due_amount) || 0).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="text-xs">
                    <p className="italic"><span className="text-slate-500 not-italic">In Words:</span> {activePatient.in_words || numberToWords(Number(activePatient.medical_fee))}</p>
                  </div>

                  <div className="flex justify-end pt-6 text-xs">
                    <div className="text-center w-40 border-t border-slate-300 pt-2 text-[10px] text-slate-500 flex flex-col items-center">
                      {user?.signature_authorised_path && (
                        <img src={user.signature_authorised_path} className="h-10 w-auto object-contain mb-1" alt="Authorised Signature" />
                      )}
                      <span>Operator / Cashier</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-12">Please load or register a patient first.</p>
              )}
            </div>
          )}

          {/* TAB 7: Label Print template */}
          {activeTab === "Label Print" && (
            <div className="flex flex-col items-center p-6 space-y-6">
              {activePatient ? (
                <>
                  {/* Dotted border container representing actual printed label shape/ratio */}
                  <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 flex flex-col items-center justify-center w-full max-w-md min-h-[280px]">
                    <div className="relative w-[150px] h-[200px] flex items-center justify-center">
                      <div
                        className={`absolute bg-white border-2 border-dashed border-slate-300 rounded shadow-md p-4 flex flex-col justify-end pb-[6px] font-sans text-black select-none`}
                        style={{
                          width: "200px",
                          height: "150px",
                          transform: "rotate(90deg)",
                        }}
                      >
                        <div className="text-center font-bold text-xs uppercase tracking-wide truncate">
                          {activePatient.first_name} {activePatient.last_name || ""}
                        </div>
                        <div className="text-center text-[10px] text-slate-500">
                          Date: {activePatient.date}
                        </div>
                        <div className="mt-1 flex justify-center">
                          <BarcodePreview value={activePatient.pax_id} displayValue={true} height={38} />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-12">Please load or register a patient first to print labels.</p>
              )}
            </div>
          )}

        </div>
      </div>
    </DashboardShell>
  );
}