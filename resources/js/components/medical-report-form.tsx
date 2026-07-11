import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Printer, QrCode, Search, Loader2, PlusCircle, CreditCard, FileText, ShieldCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import JsBarcode from "jsbarcode";

interface MedicalReportFormProps {
  mode: "general" | "malaysia";
}

const testOptions = ["Negative", "Positive", "Not tested"];
const bloodGroupOptions = ["O+ve", "A+ve", "B+ve", "AB+ve", "O-ve", "A-ve", "B-ve", "AB-ve"];

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-2">
      <Label className="text-xs font-semibold text-muted-foreground">{label}:</Label>
      {children}
    </div>
  );
}

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

export function MedicalReportForm({ mode }: MedicalReportFormProps) {
  const queryClient = useQueryClient();
  const [searchId, setSearchId] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const labelCount = 1;
  const [activeTab, setActiveTab] = useState("Edit Report");

  // 1. Column 1 fields
  const [height, setHeight] = useState("");
  const [eyeRight, setEyeRight] = useState("");
  const [earRight, setEarRight] = useState("");
  const [bp, setBp] = useState("");
  const [hernia, setHernia] = useState("Negative");
  const [hbsag, setHbsag] = useState("Negative");
  const [sBili, setSBili] = useState("");
  const [sgpt, setSgpt] = useState("");
  const [tpha, setTpha] = useState("Negative");
  const [pregnancy, setPregnancy] = useState("Negative");
  const [filaria, setFilaria] = useState("Negative");
  const [bldGroup, setBldGroup] = useState("O+ve");
  const [factor, setFactor] = useState("");
  const [rbs, setRbs] = useState("");
  const [esr, setEsr] = useState("");
  const [dc, setDc] = useState("");
  const [lymphocytes, setLymphocytes] = useState("");
  const [monocytes, setMonocytes] = useState("");
  const [rbc, setRbc] = useState("");
  const [platelets, setPlatelets] = useState("");
  const [wbc, setWbc] = useState("");
  const [ecg, setEcg] = useState("");
  const [dopThc, setDopThc] = useState("Negative");
  const [dopAmp, setDopAmp] = useState("Negative");

  // 2. Column 2 fields
  const [weight, setWeight] = useState("");
  const [eyeLeft, setEyeLeft] = useState("");
  const [earLeft, setEarLeft] = useState("");
  const [heart, setHeart] = useState("");
  const [hCeol, setHCeol] = useState("Negative");
  const [hcv, setHcv] = useState("Negative");
  const [sgot, setSgot] = useState("");
  const [vdrl, setVdrl] = useState("Negative");
  const [hiv, setHiv] = useState("Negative");
  const [suger, setSuger] = useState("");
  const [malaria, setMalaria] = useState("Negative");
  const [hemoglo, setHemoglo] = useState("");
  const [sUrea, setSUrea] = useState("");
  const [sCreati, setSCreati] = useState("");
  const [tc, setTc] = useState("");
  const [neutrophils, setNeutrophils] = useState("");
  const [eosinophils, setEosinophils] = useState("");
  const [basophils, setBasophils] = useState("");
  const [lipidProfileTg, setLipidProfileTg] = useState("");
  const [tsh, setTsh] = useState("");
  const [totalT4, setTotalT4] = useState("");
  const [albumin, setAlbumin] = useState("");
  const [dopOpi, setDopOpi] = useState("Negative");

  // 3. Bottom fields
  const [comments, setComments] = useState("");
  const [info, setInfo] = useState("Negative");
  const [onLine, setOnLine] = useState("Negative");
  const [finalStatus, setFinalStatus] = useState("Pending");

  // Fetch all patients for Next/Previous pagination
  const { data: allPatients = [] } = useQuery<any[]>({
    queryKey: ["patients-list-all"],
    queryFn: () => apiRequest("/patients"),
  });

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canEditReport = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('edit_report');
  const canPrintReport = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('print_report');

  // Load Patient Data helper
  const loadPatientData = (pData: any) => {
    setPatient(pData);
    if (pData.medical_report) {
      const mr = pData.medical_report;
      // Col 1
      setHeight(mr.height || "");
      setEyeRight(mr.eye_right || "");
      setEarRight(mr.ear_right || "");
      setBp(mr.bp || "");
      setHernia(mr.hernia || "Negative");
      setHbsag(mr.hbsag || "Negative");
      setSBili(mr.s_bili || "");
      setSgpt(mr.sgpt || "");
      setTpha(mr.tpha || "Negative");
      setPregnancy(mr.pregnancy || "Negative");
      setFilaria(mr.filaria || "Negative");
      setBldGroup(mr.bld_group || "O+ve");
      setFactor(mr.factor || "");
      setRbs(mr.rbs || "");
      setEsr(mr.esr || "");
      setDc(mr.dc || "");
      setLymphocytes(mr.lymphocytes || "");
      setMonocytes(mr.monocytes || "");
      setRbc(mr.rbc || "");
      setPlatelets(mr.platelets || "");
      setWbc(mr.wbc || "");
      setEcg(mr.ecg || "");
      setDopThc(mr.dop_thc || "Negative");
      setDopAmp(mr.dop_amp || "Negative");

      // Col 2
      setWeight(mr.weight || "");
      setEyeLeft(mr.eye_left || "");
      setEarLeft(mr.ear_left || "");
      setHeart(mr.heart || "");
      setHCeol(mr.h_ceol || "Negative");
      setHcv(mr.hcv || "Negative");
      setSgot(mr.sgot || "");
      setVdrl(mr.vdrl || "Negative");
      setHiv(mr.hiv || "Negative");
      setSuger(mr.suger || "");
      setMalaria(mr.malaria || "Negative");
      setHemoglo(mr.hemoglo || "");
      setSUrea(mr.s_urea || "");
      setSCreati(mr.s_creati || "");
      setTc(mr.tc || "");
      setNeutrophils(mr.neutrophils || "");
      setEosinophils(mr.eosinophils || "");
      setBasophils(mr.basophils || "");
      setLipidProfileTg(mr.lipid_profile_tg || "");
      setTsh(mr.tsh || "");
      setTotalT4(mr.total_t4 || "");
      setAlbumin(mr.albumin || "");
      setDopOpi(mr.dop_opi || "Negative");

      // Bottom
      setComments(mr.comments || "");
      setInfo(mr.info || "Negative");
      setOnLine(mr.on_line || "Negative");
      setFinalStatus(mr.final_status || "Pending");
    } else {
      // Reset form to defaults
      setHeight("");
      setEyeRight("");
      setEarRight("");
      setBp("");
      setHernia("Negative");
      setHbsag("Negative");
      setSBili("");
      setSgpt("");
      setTpha("Negative");
      setPregnancy("Negative");
      setFilaria("Negative");
      setBldGroup("O+ve");
      setFactor("");
      setRbs("");
      setEsr("");
      setDc("");
      setLymphocytes("");
      setMonocytes("");
      setRbc("");
      setPlatelets("");
      setWbc("");
      setEcg("");
      setDopThc("Negative");
      setDopAmp("Negative");

      setWeight("");
      setEyeLeft("");
      setEarLeft("");
      setHeart("");
      setHCeol("Negative");
      setHcv("Negative");
      setSgot("");
      setVdrl("Negative");
      setHiv("Negative");
      setSuger("");
      setMalaria("Negative");
      setHemoglo("");
      setSUrea("");
      setSCreati("");
      setTc("");
      setNeutrophils("");
      setEosinophils("");
      setBasophils("");
      setLipidProfileTg("");
      setTsh("");
      setTotalT4("");
      setAlbumin("");
      setDopOpi("Negative");

      setComments("");
      setInfo("Negative");
      setOnLine("Negative");
      setFinalStatus("Pending");
    }
  };

  useEffect(() => {
    const savedId = sessionStorage.getItem("last_searched_patient_id");
    if (savedId) {
      setSearchId(savedId);
      sessionStorage.removeItem("last_searched_patient_id");

      const performSearch = async () => {
        setLoading(true);
        try {
          const pData = await apiRequest(`/patients/${savedId}`);
          loadPatientData(pData);
          toast.success("Patient details loaded.");
        } catch (err: any) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      performSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!searchId) {
      toast.error("Please enter a Patient ID.");
      return;
    }
    setLoading(true);
    try {
      const pData = await apiRequest(`/patients/${searchId}`);
      loadPatientData(pData);
      toast.success("Patient details loaded successfully.");
    } catch (err: any) {
      toastApiError(err, "Patient not found.");
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  // NEXT / PREVIOUS Navigation sorting by ID ascending
  const handleNext = () => {
    if (!patient) return;
    const sorted = [...allPatients].sort((a, b) => a.id - b.id);
    const currentIndex = sorted.findIndex((p) => p.id === patient.id);
    if (currentIndex !== -1 && currentIndex < sorted.length - 1) {
      const nextPatient = sorted[currentIndex + 1];
      setSearchId(nextPatient.pax_id);
      loadPatientData(nextPatient);
    } else {
      toast.info("Reached end of patient list.");
    }
  };

  const handlePrevious = () => {
    if (!patient) return;
    const sorted = [...allPatients].sort((a, b) => a.id - b.id);
    const currentIndex = sorted.findIndex((p) => p.id === patient.id);
    if (currentIndex > 0) {
      const prevPatient = sorted[currentIndex - 1];
      setSearchId(prevPatient.pax_id);
      loadPatientData(prevPatient);
    } else {
      toast.info("First patient loaded.");
    }
  };

  const handlePrint = (type: string) => {
    if (!patient) {
      toast.error("Please load a patient first.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let html = "";

    if (type === "Card Front") {
      html = `
        <html>
        <head>
          <title>Card Front - ${patient.pax_id}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { width: 380px; height: 240px; border: 1px solid #ccc; border-radius: 12px; padding: 16px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
            .header { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 8px; }
            .title { font-weight: bold; font-size: 12px; color: #1e3a8a; }
            .status { font-size: 9px; font-weight: bold; background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 2px 6px; border-radius: 4px; }
            .body { display: flex; gap: 12px; margin-top: 12px; }
            .photo { width: 80px; height: 100px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; object-fit: cover; }
            .details { font-size: 12px; line-height: 1.5; }
            .bold { font-weight: bold; }
            .footer { display: flex; justify-content: space-between; align-items: end; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card">
            <div class="header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <img src="/assets/images/best-logo.png" style="height: 24px; object-fit: contain;" />
                <span style="font-weight: bold; font-size: 11px; color: #0d9488;">Best Health Diagnostic & Medical Center</span>
              </div>
              <span class="status">${patient.medical_report?.final_status || 'FIT'}</span>
            </div>
            <div class="body">
              <img class="photo" src="${patient.image_path || '/assets/images/best-logo.png'}" onerror="this.src='/assets/images/best-logo.png'" />
              <div class="details">
                <div>PAX ID: <span class="bold">${patient.pax_id}</span></div>
                <div>Name: <span class="bold">${patient.first_name} ${patient.last_name || ''}</span></div>
                <div>Passport: <span class="bold">${patient.passport_no || 'N/A'}</span></div>
                <div>Country: <span>${patient.country?.name || 'MALAYSIA'}</span></div>
              </div>
            </div>
            <div class="footer">
              <span>Issue Date: ${patient.date}</span>
              <span>Verify Online</span>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "Card Back") {
      html = `
        <html>
        <head>
          <title>Card Back - ${patient.pax_id}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { width: 380px; height: 240px; border: 1px solid #ccc; border-radius: 12px; padding: 16px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }
            .header { border-bottom: 1px solid #eee; padding-bottom: 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
            .body { font-size: 9px; color: #555; line-height: 1.6; display: flex; flex-direction: column; justify-content: center; flex: 1; }
            .footer { border-top: 1px solid #eee; padding-top: 8px; font-size: 9px; color: #999; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card">
            <div class="header">Terms & Conditions</div>
            <div class="body">
              <p>1. This card certifies the medical clearance status of the cardholder at the time of check-up.</p>
              <p>2. Any modification or tempering of this card will invalidate the medical clearance.</p>
              <p>3. Scan the QR code on the front to verify the digital report authenticity.</p>
            </div>
            <div class="footer">
              Hotline: +880-2-9876543 | Web: www.bestdiagnostic.com
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "Report") {
      html = `
        <html>
        <head>
          <title>Medical Report - ${patient.pax_id}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 20px; color: #1e3a8a; }
            .header p { margin: 2px 0; font-size: 12px; color: #666; }
            .report-title { font-weight: bold; font-size: 14px; text-align: right; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 12px; margin-bottom: 20px; }
            .meta-item { margin-bottom: 4px; }
            .bold { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f9f9f9; }
            .status-section { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
            .status-fit { font-size: 14px; font-weight: bold; color: #16a34a; }
            .signature { text-align: center; border-top: 1px solid #333; width: 150px; padding-top: 5px; font-size: 10px; color: #666; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="try { JsBarcode(document.querySelector('.barcode-svg'), '${patient.pax_id}', { format: 'CODE128', width: 1.2, height: 24, displayValue: false, margin: 0 }); } catch(e) {} setTimeout(function() { window.print(); window.close(); }, 300);">
          <div class="header" style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; gap: 16px;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="/assets/images/best-logo.png" style="height: 36px; object-fit: contain;" />
                <span style="font-weight: bold; font-size: 16px; color: #0d9488;">Best Health Diagnostic & Medical Center</span>
              </div>
              <p style="margin: 2px 0; font-size: 12px; color: #666;">1/A DIT Extension Road, Fakirapool, Dhaka-1000 | Phone: +8801756441699</p>
            </div>
            <div class="report-title" style="text-align: right; display: flex; flex-direction: column; align-items: end; gap: 4px; shrink-0;">
              <div>MEDICAL CLEARANCE REPORT</div>
              <p style="margin: 0; font-size: 12px; font-family: monospace;">ID: ${patient.pax_id}</p>
              <svg class="barcode-svg" data-pax="${patient.pax_id}"></svg>
            </div>
            <img src="${patient.image_url || '/assets/images/best-logo.png'}" onerror="this.src='/assets/images/best-logo.png'" style="width: 64px; height: 80px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; shrink-0;" />
          </div>
          <div class="meta-grid">
            <div>
              <div class="meta-item">Patient Name: <span class="bold">${patient.first_name} ${patient.last_name || ''}</span></div>
              <div class="meta-item">Father's Name: <span>${patient.father_name || 'N/A'}</span></div>
              <div class="meta-item">Passport No: <span class="bold">${patient.passport_no || 'N/A'}</span></div>
            </div>
            <div>
              <div class="meta-item">Date: <span>${patient.date}</span></div>
              <div class="meta-item">Country: <span>${patient.country?.name || 'MALAYSIA'}</span></div>
              <div class="meta-item">Agency: <span>${patient.agency?.name || 'N/A'}</span></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Test Parameter</th>
                <th>Result</th>
                <th>Reference Range</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>HIV 1 & 2 Antibody</td><td class="bold">${hiv || 'Negative'}</td><td>Negative</td></tr>
              <tr><td>HBsAg (Hepatitis B)</td><td class="bold">${hbsag || 'Negative'}</td><td>Negative</td></tr>
              <tr><td>Anti-HCV (Hepatitis C)</td><td class="bold">${hcv || 'Negative'}</td><td>Negative</td></tr>
              <tr><td>VDRL / TPHA</td><td class="bold">${vdrl || 'Negative'} / ${tpha || 'Negative'}</td><td>Negative</td></tr>
              <tr><td>Malaria Screen</td><td class="bold">${malaria || 'Negative'}</td><td>Negative</td></tr>
              <tr><td>Pregnancy (for female)</td><td class="bold">${pregnancy || 'Negative'}</td><td>Negative</td></tr>
              <tr><td>Chest X-Ray</td><td class="bold">Normal</td><td>Normal</td></tr>
              <tr><td>Blood Group</td><td class="bold">${bldGroup || 'O+ve'}</td><td>-</td></tr>
              <tr><td>ECG</td><td class="bold">${ecg || 'Normal'}</td><td>Normal</td></tr>
              <tr><td>Urine Albumin</td><td class="bold">${albumin || 'Nil'}</td><td>Nil</td></tr>
              <tr><td>Hemoglobin</td><td class="bold">${hemoglo || '14.5 g/dl'}</td><td>13-17 g/dl</td></tr>
            </tbody>
          </table>
          <div class="status-section">
            <div class="status-fit">STATUS: ${finalStatus || 'FIT'}</div>
            <div class="signature">Authorized Medical Officer</div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "Receipt") {
      html = `
        <html>
        <head>
          <title>Receipt - ${patient.pax_id}</title>
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
              <h3>MONEY RECEIPT</h3>
              <p style="margin-bottom: 6px; margin-top: 4px; font-size: 12px; color: #64748b;">Receipt Date: ${patient.date}</p>
              <svg id="receipt-barcode"></svg>
            </div>
            <img src="${patient.image_url || patient.image_path || '/assets/images/best-logo.png'}" onerror="this.src='/assets/images/best-logo.png'" style="width: 64px; height: 80px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; shrink-0;" />
          </div>
          <div class="meta-grid">
            <div class="meta-column">
              <p><span class="label">Patient Name:</span> <span class="value">${patient.first_name} ${patient.last_name || ''}</span></p>
              <p><span class="label">Patient ID:</span> <span class="value" style="font-family: monospace;">${patient.pax_id}</span></p>
              <p><span class="label">Passport No:</span> <span class="value" style="font-family: monospace;">${patient.passport_no || 'N/A'}</span></p>
            </div>
            <div class="meta-column">
              <p><span class="label">Receipt No:</span> <span class="value">REC-${patient.pax_id}</span></p>
              <p><span class="label">Agency:</span> <span class="value">${patient.agency?.name || 'N/A'}</span></p>
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
                <td class="text-right">${(Number(patient.medical_fee) || 0).toLocaleString()}</td>
              </tr>
              <tr class="total-row">
                <td>Total Amount Due</td>
                <td class="text-right">${(Number(patient.medical_fee) || 0).toLocaleString()}</td>
              </tr>
              <tr class="success-row">
                <td>Amount Paid</td>
                <td class="text-right">${(Number(patient.received_amount) || 0).toLocaleString()}</td>
              </tr>
              <tr class="destructive-row">
                <td>Due Balance</td>
                <td class="text-right">${(Number(patient.due_amount) || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <div class="in-words-section">
            <span>In Words:</span> ${patient.in_words || 'N/A'}
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
                JsBarcode('#receipt-barcode', '${patient.pax_id}', {
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
    } else if (type === "Label Print") {
      const paxId = patient.pax_id;
      const name = `${patient.first_name} ${patient.last_name || ''}`.toUpperCase().trim();
      const dateStr = patient.date || "";
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

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/medical-reports", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patient.id,
          height,
          weight,
          eye_right: eyeRight,
          eye_left: eyeLeft,
          ear_right: earRight,
          ear_left: earLeft,
          bp,
          heart,
          hernia,
          h_ceol: hCeol,
          hbsag,
          hcv,
          s_bili: sBili,
          sgot,
          sgpt,
          vdrl,
          tpha,
          hiv,
          pregnancy,
          suger,
          filaria,
          malaria,
          bld_group: bldGroup,
          hemoglo,
          factor,
          s_urea: sUrea,
          rbs,
          s_creati: sCreati,
          esr,
          tc,
          dc,
          neutrophils,
          lymphocytes,
          eosinophils,
          monocytes,
          basophils,
          rbc,
          lipid_profile_tg: lipidProfileTg,
          platelets,
          tsh,
          wbc,
          total_t4: totalT4,
          ecg,
          albumin,
          dop_thc: dopThc,
          dop_opi: dopOpi,
          dop_amp: dopAmp,
          comments,
          info,
          on_line: onLine,
          final_status: finalStatus,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Medical report saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["patients-list-all"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to save medical report.");
    }
  });

  const shellTitle = mode === "malaysia" ? "Malaysia Medical Report" : "Report Entry";
  const shellSubtitle = mode === "malaysia" ? "Complete the destination-specific test panel." : "Enter medical report data for existing patients.";
  const printLabel = mode === "malaysia" ? "Malaysia Report" : "Medical Report";

  return (
    <DashboardShell title={shellTitle} subtitle={shellSubtitle}>
      {/* Patient lookup at the top */}
      <div className="card-surface p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="w-full min-w-0 flex-1 sm:w-auto">
          <Label className="text-xs uppercase text-muted-foreground block mb-1">Search Patient by ID</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="e.g. BEST000001"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9 w-full sm:w-60"
            />
            <Button onClick={handleSearch} className="gradient-primary h-9 w-full sm:w-auto" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
        </div>
      </div>

      {patient && (
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          {/* Left Shortcuts Menu Panel */}
          <aside className="card-surface min-w-0 p-3 h-fit space-y-3">
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => window.location.href = "/entry-form"}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Entry
              </Button>
              <Button
                variant={activeTab === "Edit Report" ? "default" : "ghost"}
                className={`w-full justify-start ${activeTab === "Edit Report" ? "gradient-primary text-white" : ""}`}
                onClick={() => setActiveTab("Edit Report")}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Edit Report
              </Button>
              {canPrintReport && (
                <>
                  <Button
                    variant={activeTab === "Card Front" ? "default" : "ghost"}
                    className={`w-full justify-start ${activeTab === "Card Front" ? "gradient-primary text-white" : ""}`}
                    onClick={() => setActiveTab("Card Front")}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Card Front
                  </Button>
                  <Button
                    variant={activeTab === "Card Back" ? "default" : "ghost"}
                    className={`w-full justify-start ${activeTab === "Card Back" ? "gradient-primary text-white" : ""}`}
                    onClick={() => setActiveTab("Card Back")}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Card Back
                  </Button>
                  <Button
                    variant={activeTab === "Report" ? "default" : "ghost"}
                    className={`w-full justify-start ${activeTab === "Report" ? "gradient-primary text-white" : ""}`}
                    onClick={() => setActiveTab("Report")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {printLabel}
                  </Button>
                  <Button
                    variant={activeTab === "Receipt" ? "default" : "ghost"}
                    className={`w-full justify-start ${activeTab === "Receipt" ? "gradient-primary text-white" : ""}`}
                    onClick={() => setActiveTab("Receipt")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Money Receipt
                  </Button>
                  <Button
                    variant={activeTab === "Label Print" ? "default" : "ghost"}
                    className={`w-full justify-start ${activeTab === "Label Print" ? "gradient-primary text-white" : ""}`}
                    onClick={() => setActiveTab("Label Print")}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Label Print
                  </Button>
                </>
              )}
            </div>

            {activeTab !== "Edit Report" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="gradient-primary shadow-md w-full"
                  onClick={() => handlePrint(activeTab === "Receipt" ? "Receipt" : activeTab)}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Document
                </Button>
              </div>
            )}

            <div className="border-t border-border/40 pt-2 space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleNext}
              >
                NEXT →
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handlePrevious}
              >
                ← PREVIOUS
              </Button>
            </div>
          </aside>

          {/* Right form inputs grid or previews */}
          <div className="card-surface min-w-0 p-6 space-y-6">
            {activeTab === "Edit Report" && (
              <>
                {/* Top Patient Meta Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-b border-border/60 pb-5">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Patient ID</Label>
                    <Input value={patient.pax_id} disabled className="bg-muted/40 font-mono" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Date</Label>
                    <Input value={patient.date || ""} disabled className="bg-muted/40" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">First Name</Label>
                    <Input value={patient.first_name} disabled className="bg-muted/40" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Passport</Label>
                    <Input value={patient.passport_no || ""} disabled className="bg-muted/40 font-mono" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Father Name</Label>
                    <Input value={patient.father_name || ""} disabled className="bg-muted/40" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Country</Label>
                    <Input value={patient.country?.name || "MALAYSIA"} disabled className="bg-muted/40" />
                  </div>
                </div>

                {/* Test Panel Columns */}
                <div className="grid gap-8 md:grid-cols-2">
                  {/* Column 1 Inputs */}
                  <div className="space-y-3">
                    <FormField label="Height">
                      <Input value={height} onChange={(e) => setHeight(e.target.value)} />
                    </FormField>
                    <FormField label="Eye Right">
                      <Input value={eyeRight} onChange={(e) => setEyeRight(e.target.value)} />
                    </FormField>
                    <FormField label="Ear Right">
                      <Input value={earRight} onChange={(e) => setEarRight(e.target.value)} />
                    </FormField>
                    <FormField label="BP">
                      <Input value={bp} onChange={(e) => setBp(e.target.value)} />
                    </FormField>
                    <FormField label="Hernia">
                      <Select value={hernia} onValueChange={setHernia}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="HBsAg">
                      <Select value={hbsag} onValueChange={setHbsag}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="S.Bili">
                      <Input value={sBili} onChange={(e) => setSBili(e.target.value)} />
                    </FormField>
                    <FormField label="SGPT">
                      <Input value={sgpt} onChange={(e) => setSgpt(e.target.value)} />
                    </FormField>
                    <FormField label="TPHA">
                      <Select value={tpha} onValueChange={setTpha}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Prgncy">
                      <Select value={pregnancy} onValueChange={setPregnancy}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Filaria">
                      <Select value={filaria} onValueChange={setFilaria}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Bld Group">
                      <Select value={bldGroup} onValueChange={setBldGroup}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {bloodGroupOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Factor">
                      <Input value={factor} onChange={(e) => setFactor(e.target.value)} />
                    </FormField>
                    <FormField label="RBS">
                      <Input value={rbs} onChange={(e) => setRbs(e.target.value)} />
                    </FormField>
                    <FormField label="ESR">
                      <Input value={esr} onChange={(e) => setEsr(e.target.value)} />
                    </FormField>
                    <FormField label="DC">
                      <Input value={dc} onChange={(e) => setDc(e.target.value)} />
                    </FormField>
                    <FormField label="Lymphocytes">
                      <Input value={lymphocytes} onChange={(e) => setLymphocytes(e.target.value)} />
                    </FormField>
                    <FormField label="Monocytes">
                      <Input value={monocytes} onChange={(e) => setMonocytes(e.target.value)} />
                    </FormField>
                    <FormField label="RBC">
                      <Input value={rbc} onChange={(e) => setRbc(e.target.value)} />
                    </FormField>
                    <FormField label="Platelets">
                      <Input value={platelets} onChange={(e) => setPlatelets(e.target.value)} />
                    </FormField>
                    <FormField label="WBC">
                      <Input value={wbc} onChange={(e) => setWbc(e.target.value)} />
                    </FormField>
                    <FormField label="ECG">
                      <Input value={ecg} onChange={(e) => setEcg(e.target.value)} />
                    </FormField>
                    <FormField label="DOP/THC">
                      <Select value={dopThc} onValueChange={setDopThc}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="DOP/AMP">
                      <Select value={dopAmp} onValueChange={setDopAmp}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  {/* Column 2 Inputs */}
                  <div className="space-y-3">
                    <FormField label="weight">
                      <Input value={weight} onChange={(e) => setWeight(e.target.value)} />
                    </FormField>
                    <FormField label="Eye Left">
                      <Input value={eyeLeft} onChange={(e) => setEyeLeft(e.target.value)} />
                    </FormField>
                    <FormField label="Ear Left">
                      <Input value={earLeft} onChange={(e) => setEarLeft(e.target.value)} />
                    </FormField>
                    <FormField label="HEART">
                      <Input value={heart} onChange={(e) => setHeart(e.target.value)} />
                    </FormField>
                    <FormField label="H. Ceol">
                      <Select value={hCeol} onValueChange={setHCeol}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="HCV">
                      <Select value={hcv} onValueChange={setHcv}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="SGOT">
                      <Input value={sgot} onChange={(e) => setSgot(e.target.value)} />
                    </FormField>
                    <FormField label="VDRL">
                      <Select value={vdrl} onValueChange={setVdrl}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="HIV">
                      <Select value={hiv} onValueChange={setHiv}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Suger">
                      <Input value={suger} onChange={(e) => setSuger(e.target.value)} />
                    </FormField>
                    <FormField label="Malaria">
                      <Select value={malaria} onValueChange={setMalaria}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Hemoglo">
                      <Input value={hemoglo} onChange={(e) => setHemoglo(e.target.value)} />
                    </FormField>
                    <FormField label="S. Urea">
                      <Input value={sUrea} onChange={(e) => setSUrea(e.target.value)} />
                    </FormField>
                    <FormField label="S. Creati">
                      <Input value={sCreati} onChange={(e) => setSCreati(e.target.value)} />
                    </FormField>
                    <FormField label="TC">
                      <Input value={tc} onChange={(e) => setTc(e.target.value)} />
                    </FormField>
                    <FormField label="Neutrophils">
                      <Input value={neutrophils} onChange={(e) => setNeutrophils(e.target.value)} />
                    </FormField>
                    <FormField label="Eosinophils">
                      <Input value={eosinophils} onChange={(e) => setEosinophils(e.target.value)} />
                    </FormField>
                    <FormField label="Basophils">
                      <Input value={basophils} onChange={(e) => setBasophils(e.target.value)} />
                    </FormField>
                    <FormField label="Lipid (TG)">
                      <Input value={lipidProfileTg} onChange={(e) => setLipidProfileTg(e.target.value)} />
                    </FormField>
                    <FormField label="TSH">
                      <Input value={tsh} onChange={(e) => setTsh(e.target.value)} />
                    </FormField>
                    <FormField label="Total T4">
                      <Input value={totalT4} onChange={(e) => setTotalT4(e.target.value)} />
                    </FormField>
                    <FormField label="Albumin">
                      <Input value={albumin} onChange={(e) => setAlbumin(e.target.value)} />
                    </FormField>
                    <FormField label="DOP/OPI">
                      <Select value={dopOpi} onValueChange={setDopOpi}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </div>

                {/* Comments block */}
                <div className="border-t border-border/40 pt-4 space-y-3">
                  <div>
                    <Label>Comments</Label>
                    <Textarea
                      placeholder="Enter medical examiner comments…"
                      rows={2}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label>INFO</Label>
                      <Select value={info} onValueChange={setInfo}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>On Line</Label>
                      <Select value={onLine} onValueChange={setOnLine}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {testOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Report Status</Label>
                      <Select value={finalStatus} onValueChange={setFinalStatus}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fit">FIT</SelectItem>
                          <SelectItem value="Unfit">UNFIT</SelectItem>
                          <SelectItem value="Pending">PENDING</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                {canEditReport && (
                  <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
                    <Button
                      variant="destructive"
                      className="w-32 bg-red-600 hover:bg-red-700 h-9 font-bold"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: Card Front template */}
            {activeTab === "Card Front" && (
              <div className="flex flex-col items-center p-6">
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
                      {finalStatus || "FIT"}
                    </span>
                  </div>

                  <div className="flex gap-3 my-2 flex-1 items-center">
                    <div className="w-20 h-24 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 overflow-hidden shrink-0">
                      {patient.image_url ? (
                        <img src={patient.image_url} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        "NO PHOTO"
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <p><span className="text-slate-500">PAX ID:</span> <span className="font-mono font-bold text-primary">{patient.pax_id}</span></p>
                      <p><span className="text-slate-500">Name:</span> <span className="font-semibold">{patient.first_name} {patient.last_name || ""}</span></p>
                      <p><span className="text-slate-500">Passport:</span> <span className="font-mono">{patient.passport_no || "N/A"}</span></p>
                      <p><span className="text-slate-500">Country:</span> <span>{patient.country?.name || "MALAYSIA"}</span></p>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                    <div>
                      <p>Issue Date: {patient.date}</p>
                    </div>
                    <QrCode className="h-6 w-6 text-slate-700" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Card Back template */}
            {activeTab === "Card Back" && (
              <div className="flex flex-col items-center p-6">
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
              </div>
            )}

            {/* TAB 4: Medical Report template */}
            {activeTab === "Report" && (
              <div className="p-4 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-6 font-sans">
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
                    <p className="text-xs text-slate-500 font-mono">ID: {patient.pax_id}</p>
                    <div className="h-6">
                      <BarcodePreview value={patient.pax_id} displayValue={false} height={20} />
                    </div>
                  </div>
                  <div className="w-16 h-20 border border-slate-200 rounded overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                    {patient.image_url ? (
                      <img src={patient.image_url} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-slate-400">NO PHOTO</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p><span className="text-slate-500">Patient Name:</span> <span className="font-semibold">{patient.first_name} {patient.last_name || ""}</span></p>
                    <p><span className="text-slate-500">Father's Name:</span> <span>{patient.father_name || "N/A"}</span></p>
                    <p><span className="text-slate-500">Passport No:</span> <span className="font-mono font-semibold">{patient.passport_no || "N/A"}</span></p>
                  </div>
                  <div>
                    <p><span className="text-slate-500">Date:</span> <span>{patient.date}</span></p>
                    <p><span className="text-slate-500">Country:</span> <span>{patient.country?.name || "MALAYSIA"}</span></p>
                    <p><span className="text-slate-500">Agency:</span> <span>{patient.agency?.name || "N/A"}</span></p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-semibold">Test Parameter</th>
                        <th className="px-4 py-2 font-semibold">Result</th>
                        <th className="px-4 py-2 font-semibold">Reference Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="px-4 py-1.5 font-medium">HIV 1 & 2 Antibody</td><td className="px-4 py-1.5 font-semibold text-primary">{hiv || 'Negative'}</td><td className="px-4 py-1.5 text-slate-400">Negative</td></tr>
                      <tr><td className="px-4 py-1.5 font-medium">HBsAg (Hepatitis B)</td><td className="px-4 py-1.5 font-semibold text-primary">{hbsag || 'Negative'}</td><td className="px-4 py-1.5 text-slate-400">Negative</td></tr>
                      <tr><td className="px-4 py-1.5 font-medium">Anti-HCV (Hepatitis C)</td><td className="px-4 py-1.5 font-semibold text-primary">{hcv || 'Negative'}</td><td className="px-4 py-1.5 text-slate-400">Negative</td></tr>
                      <tr><td className="px-4 py-1.5 font-medium">VDRL / TPHA</td><td className="px-4 py-1.5 font-semibold text-primary">{(vdrl || 'Negative') + ' / ' + (tpha || 'Negative')}</td><td className="px-4 py-1.5 text-slate-400">Negative</td></tr>
                      <tr><td className="px-4 py-1.5 font-medium">Malaria Screen</td><td className="px-4 py-1.5 font-semibold text-primary">{malaria || 'Negative'}</td><td className="px-4 py-1.5 text-slate-400">Negative</td></tr>
                      <tr><td className="px-4 py-1.5 font-medium">Pregnancy (for female)</td><td className="px-4 py-1.5 font-semibold text-primary">{pregnancy || 'Negative'}</td><td className="px-4 py-1.5 text-slate-400">Negative</td></tr>
                      <tr><td className="px-4 py-1.5 font-medium">Chest X-Ray</td><td className="px-4 py-1.5 font-semibold text-primary">Normal</td><td className="px-4 py-1.5 text-slate-400">Normal</td></tr>
                      <tr><td className="px-4 py-1.5 font-medium">Blood Group</td><td className="px-4 py-1.5 font-semibold text-primary">{bldGroup || 'O+ve'}</td><td className="px-4 py-1.5 text-slate-400">-</td></tr>
                      <tr><td className="px-4 py-1.5 font-medium">ECG</td><td className="px-4 py-1.5 font-semibold text-primary">{ecg || 'Normal'}</td><td className="px-4 py-1.5 text-slate-400">Normal</td></tr>
                      <tr><td className="px-4 py-1.5 font-medium">Urine Albumin</td><td className="px-4 py-1.5 font-semibold text-primary">{albumin || 'Nil'}</td><td className="px-4 py-1.5 text-slate-400">Nil</td></tr>
                      <tr><td className="px-4 py-1.5 font-medium">Hemoglobin</td><td className="px-4 py-1.5 font-semibold text-primary">{hemoglo || '14.5 g/dl'}</td><td className="px-4 py-1.5 text-slate-400">13-17 g/dl</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-slate-100 text-xs">
                  <div>
                    <p className="font-semibold uppercase text-success flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" /> STATUS: {finalStatus || "FIT"}
                    </p>
                  </div>
                  <div className="text-center w-40 border-t border-slate-300 pt-2 text-[10px] text-slate-500">
                    Authorized Medical Officer
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Money Receipt template */}
            {activeTab === "Receipt" && (
              <div className="p-4 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-6 font-sans">
                <div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <img src={user?.logo_path || "/assets/images/best-logo.png"} alt="Logo" className="h-9 object-contain" />
                      <span className="font-bold text-sm text-primary">{user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
                  </div>
                  <div className="text-right text-xs flex flex-col items-end gap-1 shrink-0">
                    <h3 className="font-bold text-sm">MONEY RECEIPT</h3>
                    <p className="font-mono text-xs text-slate-500 mb-1">Receipt Date: {patient.date}</p>
                    <BarcodePreview value={patient.pax_id} displayValue={true} height={30} />
                  </div>
                  <div className="w-16 h-20 border border-slate-200 rounded overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                    {patient.image_url ? (
                      <img src={patient.image_url} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-slate-400">NO PHOTO</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-4">
                  <div>
                    <p><span className="text-slate-500">Patient Name:</span> <span className="font-semibold">{patient.first_name} {patient.last_name || ""}</span></p>
                    <p><span className="text-slate-500">Patient ID:</span> <span className="font-mono font-semibold">{patient.pax_id}</span></p>
                    <p><span className="text-slate-500">Passport No:</span> <span className="font-mono font-semibold">{patient.passport_no || "N/A"}</span></p>
                  </div>
                  <div>
                    <p><span className="text-slate-500">Receipt No:</span> <span className="font-mono font-semibold">REC-{patient.pax_id}</span></p>
                    <p><span className="text-slate-500">Agency:</span> <span>{patient.agency?.name || "N/A"}</span></p>
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
                        <td className="px-4 py-2 text-right">{(Number(patient.medical_fee) || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-50/50 font-semibold">
                        <td className="px-4 py-2">Total Amount Due</td>
                        <td className="px-4 py-2 text-right">{(Number(patient.medical_fee) || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="text-success font-semibold">
                        <td className="px-4 py-2">Amount Paid</td>
                        <td className="px-4 py-2 text-right">{(Number(patient.received_amount) || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="text-destructive font-semibold">
                        <td className="px-4 py-2">Due Balance</td>
                        <td className="px-4 py-2 text-right">{(Number(patient.due_amount) || 0).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-[11px] text-slate-500 italic">
                  <span>In Words: </span>
                  <span>{patient.in_words || "N/A"}</span>
                </div>
              </div>
            )}

            {/* TAB 6: Label Print template */}
            {activeTab === "Label Print" && (
              <div className="flex flex-col items-center p-6 space-y-6">
                <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 flex flex-col items-center justify-center w-full max-w-md min-h-[280px]">
                  <div className="relative w-[150px] h-[200px] flex items-center justify-center">
                    <div
                      className="absolute bg-white border-2 border-dashed border-slate-300 rounded shadow-md p-4 flex flex-col justify-end pb-[6px] font-sans text-black select-none"
                      style={{
                        width: "200px",
                        height: "150px",
                        transform: "rotate(90deg)",
                      }}
                    >
                      <div className="text-center font-bold text-xs uppercase tracking-wide truncate">
                        {patient.first_name} {patient.last_name || ""}
                      </div>
                      <div className="text-center text-[10px] text-slate-500">
                        Date: {patient.date}
                      </div>
                      <div className="mt-1 flex justify-center">
                        <BarcodePreview value={patient.pax_id} displayValue={true} height={38} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
