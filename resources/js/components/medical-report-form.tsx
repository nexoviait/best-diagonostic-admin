import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, Printer, Search, Loader2, PlusCircle, FileText } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import { MedicalReportView } from "@/components/medical-report-view";
import { PadReportView } from "@/components/pad-report-view";

interface MedicalReportFormProps {
  mode: "general" | "malaysia";
}

const testOptions = ["Negative", "Positive", "N/A"];
const vdrlOptions = ["Non-Reactive", "Reactive", "N/A"];
const herniaOptions = ["Absent", "Present", "N/A"];
const bloodGroupOptions = ["O+ve", "A+ve", "B+ve", "AB+ve", "O-ve", "A-ve", "B-ve", "AB-ve"];
const ecgOptions = ["Normal", "Abnormal", "N/A"];
const varicoseVeinsOptions = ["Negative", "Positive", "N/A"];
const psychiatryOptions = ["Normal", "Abnormal", "N/A"];

const heightOptions = (() => {
  const opts: string[] = [];
  for (let ft = 4; ft <= 6; ft++) {
    for (let inch = 1; inch <= 11; inch++) {
      opts.push(`${String(ft).padStart(2, "0")} Feet ${String(inch).padStart(2, "0")} Inch`);
    }
  }
  return opts;
})();

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] items-start sm:items-center gap-1 sm:gap-2 min-w-0 w-full">
      <Label className="text-xs font-semibold text-muted-foreground pt-1 sm:pt-0">{label}:</Label>
      <div className="min-w-0 w-full">{children}</div>
    </div>
  );
}

function formatAge(dobStr?: string, explicitAge?: any) {
  if (explicitAge !== undefined && explicitAge !== null && String(explicitAge).trim() !== "") {
    const parsedExplicit = parseInt(String(explicitAge), 10);
    return !isNaN(parsedExplicit) ? `${parsedExplicit} Yrs` : String(explicitAge);
  }
  const rawDob = dobStr || "";
  if (!rawDob || String(rawDob).trim() === "") return "";
  const str = String(rawDob).trim();

  const numberOnlyMatch = str.match(/^(\d{1,3})\s*(yrs?|years?|y)?$/i);
  if (numberOnlyMatch) return `${numberOnlyMatch[1]} Yrs`;

  let birthDate: Date | null = null;
  const ddmmyyyy = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
  if (ddmmyyyy) {
    birthDate = new Date(parseInt(ddmmyyyy[3], 10), parseInt(ddmmyyyy[2], 10) - 1, parseInt(ddmmyyyy[1], 10));
  } else {
    const yyyymmdd = str.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
    if (yyyymmdd) {
      birthDate = new Date(parseInt(yyyymmdd[1], 10), parseInt(yyyymmdd[2], 10) - 1, parseInt(yyyymmdd[3], 10));
    }
  }

  if (birthDate && !isNaN(birthDate.getTime())) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? `${age} Yrs` : "0 Yrs";
  }

  return str;
}

export function MedicalReportForm({ mode }: MedicalReportFormProps) {
  const queryClient = useQueryClient();
  const [searchId, setSearchId] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Edit Report");
  const [scale, setScale] = useState(1);
  const previewWrapperRef = useRef<HTMLDivElement>(null);

  const { data: settings } = useQuery<any>({
    queryKey: ["public-settings"],
    queryFn: () => apiRequest("/public/site-settings"),
  });

  useEffect(() => {
    const updateScale = () => {
      if (previewWrapperRef.current) {
        const availableWidth = previewWrapperRef.current.clientWidth - 24;
        if (availableWidth > 0 && availableWidth < 794) {
          const calculatedScale = Math.min(Math.max(availableWidth / 794, 0.35), 1);
          setScale(calculatedScale);
        } else {
          setScale(1);
        }
      } else {
        const screenWidth = window.innerWidth;
        if (screenWidth < 840) {
          const availableWidth = Math.max(screenWidth - 32, 280);
          setScale(Math.min(availableWidth / 794, 1));
        } else {
          setScale(1);
        }
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (previewWrapperRef.current) {
      observer.observe(previewWrapperRef.current);
    }
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [activeTab, patient]);

  // 1. Column 1 fields
  const [height, setHeight] = useState("");
  const [eyeRight, setEyeRight] = useState("6/6");
  const [earRight, setEarRight] = useState("NAD");
  const [bp, setBp] = useState("");
  const [hernia, setHernia] = useState("N/A");
  const [hbsag, setHbsag] = useState("N/A");
  const [sBili, setSBili] = useState("");
  const [sgpt, setSgpt] = useState("");
  const [tpha, setTpha] = useState("N/A");
  const [pregnancy, setPregnancy] = useState("N/A");
  const [filaria, setFilaria] = useState("N/A");
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
  const [ecg, setEcg] = useState("N/A");
  const [dopThc, setDopThc] = useState("N/A");
  const [dopAmp, setDopAmp] = useState("N/A");
  const [varicoseVeins, setVaricoseVeins] = useState("N/A");
  const [psychiatry, setPsychiatry] = useState("N/A");

  // 2. Column 2 fields
  const [weight, setWeight] = useState("");
  const [eyeLeft, setEyeLeft] = useState("6/6");
  const [earLeft, setEarLeft] = useState("NAD");
  const [heart, setHeart] = useState("");
  const [hCeol, setHCeol] = useState("N/A");
  const [hcv, setHcv] = useState("N/A");
  const [sgot, setSgot] = useState("");
  const [vdrl, setVdrl] = useState("N/A");
  const [hiv, setHiv] = useState("N/A");
  const [suger, setSuger] = useState("");
  const [malaria, setMalaria] = useState("N/A");
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
  const [dopOpi, setDopOpi] = useState("N/A");

  // 3. Bottom fields
  const [comments, setComments] = useState("");
  const [info, setInfo] = useState("N/A");
  const [onLine, setOnLine] = useState("N/A");
  const [finalStatus, setFinalStatus] = useState("Held up");

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
      setEyeRight(mr.eye_right || "6/6");
      setEarRight(mr.ear_right || "NAD");
      setBp(mr.bp || "");
      setHernia(mr.hernia || "N/A");
      setHbsag(mr.hbsag || "N/A");
      setSBili(mr.s_bili || "");
      setSgpt(mr.sgpt || "");
      setTpha(mr.tpha || "N/A");
      setPregnancy(mr.pregnancy || "N/A");
      setFilaria(mr.filaria || "N/A");
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
      setEcg(mr.ecg || "N/A");
      setDopThc(mr.dop_thc || "N/A");
      setDopAmp(mr.dop_amp || "N/A");
      setVaricoseVeins(mr.varicose_veins || "N/A");
      setPsychiatry(mr.psychiatry || "N/A");

      // Col 2
      setWeight(mr.weight || "");
      setEyeLeft(mr.eye_left || "6/6");
      setEarLeft(mr.ear_left || "NAD");
      setHeart(mr.heart || "");
      setHCeol(mr.h_ceol || "N/A");
      setHcv(mr.hcv || "N/A");
      setSgot(mr.sgot || "");
      setVdrl(mr.vdrl || "N/A");
      setHiv(mr.hiv || "N/A");
      setSuger(mr.suger || "");
      setMalaria(mr.malaria || "N/A");
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
      setDopOpi(mr.dop_opi || "N/A");

      // Bottom
      setComments(mr.comments || "");
      setInfo(mr.info || "N/A");
      setOnLine(mr.on_line || "N/A");
      setFinalStatus(mr.final_status || "Held up");
    } else {
      // Reset form to defaults
      setHeight("");
      setEyeRight("6/6");
      setEarRight("NAD");
      setBp("");
      setHernia("N/A");
      setHbsag("N/A");
      setSBili("");
      setSgpt("");
      setTpha("N/A");
      setPregnancy("N/A");
      setFilaria("N/A");
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
      setEcg("N/A");
      setDopThc("N/A");
      setDopAmp("N/A");
      setVaricoseVeins("N/A");
      setPsychiatry("N/A");

      setWeight("");
      setEyeLeft("6/6");
      setEarLeft("NAD");
      setHeart("");
      setHCeol("N/A");
      setHcv("N/A");
      setSgot("");
      setVdrl("N/A");
      setHiv("N/A");
      setSuger("");
      setMalaria("N/A");
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
      setDopOpi("N/A");

      setComments("");
      setInfo("N/A");
      setOnLine("N/A");
      setFinalStatus("Held up");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get("patient_id");
      if (pid) {
        setSearchId(pid);
        setLoading(true);
        apiRequest(`/patients/${pid}`)
          .then((res) => {
            loadPatientData(res);
          })
          .catch((err) => {
            toastApiError(err, "Patient not found");
          })
          .finally(() => setLoading(false));
      }
    }
  }, []);

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/patients/${searchId.trim()}`);
      loadPatientData(res);
      toast.success("Patient details loaded successfully.");
    } catch (err: any) {
      toastApiError(err, "Patient not found.");
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  // NEXT / PREVIOUS Navigation sorting by ID descending (implied chronological/newest)
  const handleNext = () => {
    if (!patient || !allPatients.length) return;
    const sorted = [...allPatients].sort((a, b) => b.id - a.id);
    const currentIndex = sorted.findIndex((p) => p.id === patient.id);
    if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
      const nextPatient = sorted[currentIndex + 1];
      setSearchId(nextPatient.pax_id);
      loadPatientData(nextPatient);
    } else {
      toast.info("Reached end of patient list.");
    }
  };

  const handlePrevious = () => {
    if (!patient || !allPatients.length) return;
    const sorted = [...allPatients].sort((a, b) => b.id - a.id);
    const currentIndex = sorted.findIndex((p) => p.id === patient.id);
    if (currentIndex > 0) {
      const prevPatient = sorted[currentIndex - 1];
      setSearchId(prevPatient.pax_id);
      loadPatientData(prevPatient);
    } else {
      toast.info("Reached beginning of patient list.");
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!patient) throw new Error("No patient loaded.");
      const payload = {
        patient_id: patient.id,
        height, eye_right: eyeRight, ear_right: earRight, bp, hernia, hbsag, s_bili: sBili, sgpt, tpha, pregnancy, filaria, bld_group: bldGroup, factor, rbs, esr, dc, lymphocytes, monocytes, rbc, platelets, wbc, ecg, dop_thc: dopThc, dop_amp: dopAmp, varicose_veins: varicoseVeins, psychiatry,
        weight, eye_left: eyeLeft, ear_left: earLeft, heart, h_ceol: hCeol, hcv, sgot, vdrl, hiv, suger, malaria, hemoglo, s_urea: sUrea, s_creati: sCreati, tc, neutrophils, eosinophils, basophils, lipid_profile_tg: lipidProfileTg, tsh, total_t4: totalT4, albumin, dop_opi: dopOpi,
        comments, info, on_line: onLine, final_status: finalStatus,
      };
      return apiRequest("/medical-reports", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success("Medical report saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["patients-list-all"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to save medical report.");
    },
  });

  const shellTitle = mode === "malaysia" ? "Malaysia Medical Report" : "Report Entry";
  const shellSubtitle = mode === "malaysia" ? "Complete the destination-specific test panel." : "Enter medical report data for existing patients.";

  return (
    <DashboardShell title={shellTitle} subtitle={shellSubtitle}>
      {/* Patient lookup & info at the top */}
      <div className="card-surface p-4 mb-4 flex items-center justify-between gap-4 flex-wrap sticky top-[77px] z-20 no-print">
        {/* Top sticky info (Name, Age, Country) */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground block mb-1">Name</Label>
            <Input
              readOnly
              value={patient ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim() : ""}
              placeholder="Name"
              className="h-9 w-36 sm:w-52 bg-muted/40 font-medium"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground block mb-1">Age</Label>
            <Input
              readOnly
              value={patient ? formatAge(patient.dob, patient.age) : ""}
              placeholder="Age"
              className="h-9 w-24 bg-muted/40 font-medium"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground block mb-1">Country</Label>
            <Input
              readOnly
              value={patient?.country?.name || patient?.nationality || (patient ? "MALAYSIA" : "")}
              placeholder="Country"
              className="h-9 w-32 sm:w-44 bg-muted/40 font-medium uppercase"
            />
          </div>
        </div>

        {/* Search Patient by ID & Print Action */}
        <div className="w-full min-w-0 lg:w-auto flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <Label className="text-xs uppercase text-muted-foreground block mb-1">Search Patient by ID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. BEST000001"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-9 w-full min-w-0"
              />
              <Button onClick={handleSearch} className="gradient-primary h-9 shrink-0" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>
          </div>

          {patient && activeTab === "Report" && (
            <Button onClick={() => window.print()} className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs gap-1.5 font-bold h-9 shrink-0">
              <Printer className="h-3.5 w-3.5" /> Print Report
            </Button>
          )}
          {patient && activeTab === "Pad Report" && (
            <Button onClick={() => window.print()} className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs gap-1.5 font-bold h-9 shrink-0">
              <Printer className="h-3.5 w-3.5" /> Print Pad Report
            </Button>
          )}
        </div>
      </div>

      {patient && (
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          {/* Left Shortcuts Menu Panel */}
          <aside className="card-surface min-w-0 p-2 sm:p-3 h-fit sticky top-[77px] z-10 self-start no-print">
            <div className="flex flex-wrap lg:flex-col gap-1.5">
              <Button
                variant="ghost"
                className="justify-start text-xs sm:text-sm h-9"
                onClick={() => window.location.href = "/entry-form"}
              >
                <PlusCircle className="mr-1.5 h-4 w-4 shrink-0" />
                New Entry
              </Button>
              <Button
                variant={activeTab === "Edit Report" ? "default" : "ghost"}
                className={`justify-start text-xs sm:text-sm h-9 ${activeTab === "Edit Report" ? "gradient-primary text-white" : ""}`}
                onClick={() => setActiveTab("Edit Report")}
              >
                <PlusCircle className="mr-1.5 h-4 w-4 shrink-0" />
                Edit Report
              </Button>
              {canPrintReport && (
                <>
                  <Button
                    variant={activeTab === "Report" ? "default" : "ghost"}
                    className={`justify-start text-xs sm:text-sm h-9 ${activeTab === "Report" ? "gradient-primary text-white" : ""}`}
                    onClick={() => setActiveTab("Report")}
                  >
                    <FileText className="mr-1.5 h-4 w-4 shrink-0" />
                    Report
                  </Button>
                  <Button
                    variant={activeTab === "Pad Report" ? "default" : "ghost"}
                    className={`justify-start text-xs sm:text-sm h-9 ${activeTab === "Pad Report" ? "gradient-primary text-white" : ""}`}
                    onClick={() => setActiveTab("Pad Report")}
                  >
                    <FileText className="mr-1.5 h-4 w-4 shrink-0" />
                    Pad Report
                  </Button>
                </>
              )}
            </div>
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
                      <Select value={height} onValueChange={setHeight}>
                        <SelectTrigger className="h-8.5"><SelectValue placeholder="Select height" /></SelectTrigger>
                        <SelectContent>
                          {heightOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
                          {herniaOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
                    <FormField label="RBC">
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
                      <Select value={ecg} onValueChange={setEcg}>
                        <SelectTrigger className="h-8.5"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {ecgOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
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
                    <FormField label="Varicose Veins">
                      <Select value={varicoseVeins} onValueChange={setVaricoseVeins}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {varicoseVeinsOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Psychiatry">
                      <Select value={psychiatry} onValueChange={setPsychiatry}>
                        <SelectTrigger className="h-8.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {psychiatryOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  {/* Column 2 Inputs */}
                  <div className="space-y-3">
                    <FormField label="weight">
                      <div className="relative">
                        <Input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="pr-9"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
                      </div>
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
                          {vdrlOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
                          <SelectItem value="Held up">HELD UP</SelectItem>
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

            {/* TAB 4: Medical Report template */}
            {activeTab === "Report" && (
              <div ref={previewWrapperRef} className="bg-white p-2 sm:p-4 rounded-xl border border-slate-200 overflow-x-auto flex justify-center min-w-0 w-full">
                <MedicalReportView
                  patient={patient}
                  formValues={{
                    height,
                    weight,
                    eyeRight,
                    eyeLeft,
                    earRight,
                    earLeft,
                    bp,
                    hernia,
                    hbsag,
                    sBili,
                    sgpt,
                    tpha,
                    pregnancy,
                    bldGroup,
                    rbs,
                    esr,
                    dc,
                    lymphocytes,
                    monocytes,
                    rbc,
                    platelets,
                    wbc,
                    ecg,
                    dopThc,
                    dopAmp,
                    dopOpi,
                    heart,
                    hCeol,
                    hcv,
                    sgot,
                    vdrl,
                    hiv,
                    suger,
                    malaria,
                    hemoglo,
                    sUrea,
                    sCreati,
                    tc,
                    neutrophils,
                    eosinophils,
                    basophils,
                    lipidProfileTg,
                    tsh,
                    totalT4,
                    albumin,
                    comments,
                    finalStatus,
                    varicoseVeins,
                    psychiatry,
                  }}
                  settings={settings}
                  scale={scale}
                />
              </div>
            )}

            {/* TAB 5: Medical Pad Report template */}
            {activeTab === "Pad Report" && (
              <div ref={previewWrapperRef} className="bg-white p-2 sm:p-4 rounded-xl border border-slate-200 overflow-x-auto flex justify-center min-w-0 w-full">
                <PadReportView
                  patient={patient}
                  formValues={{
                    height,
                    weight,
                    eyeRight,
                    eyeLeft,
                    earRight,
                    earLeft,
                    bp,
                    hernia,
                    hbsag,
                    sBili,
                    sgpt,
                    tpha,
                    pregnancy,
                    bldGroup,
                    rbs,
                    esr,
                    dc,
                    lymphocytes,
                    monocytes,
                    rbc,
                    platelets,
                    wbc,
                    ecg,
                    dopThc,
                    dopAmp,
                    dopOpi,
                    heart,
                    hCeol,
                    hcv,
                    sgot,
                    vdrl,
                    hiv,
                    suger,
                    malaria,
                    hemoglo,
                    sUrea,
                    sCreati,
                    tc,
                    neutrophils,
                    eosinophils,
                    basophils,
                    lipidProfileTg,
                    tsh,
                    totalT4,
                    albumin,
                    comments,
                    finalStatus,
                    varicoseVeins,
                    psychiatry,
                  }}
                  settings={settings}
                  scale={scale}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
