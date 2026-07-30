import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { validateImageFile } from "@/lib/validate-image";
import { useFieldErrors } from "@/lib/use-field-errors";

export const Route = createFileRoute("/xray")({ component: XrayPage });

function XrayPage() {
  const [searchId, setSearchId] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Xray form states
  const [date, setDate] = useState("");
  const [remark, setRemark] = useState("");
  const [findings, setFindings] = useState("");
  const [result, setResult] = useState("Fit");
  const [xrayImageFile, setXrayImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const { fieldErrors, setFromError, clear } = useFieldErrors();

  const handleXrayImageChange = (file: File | null) => {
    setXrayImageFile(file);
    setImageError(validateImageFile(file, { maxSizeKB: 2048 }));
    clear("xray_image");
  };

  const { data: user } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
    enabled: typeof window !== "undefined" && !!localStorage.getItem("mediadmin_token"),
  });
  const canUploadXray = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('upload_xray');

  useEffect(() => {
    const savedId = sessionStorage.getItem("xray_load_pax");
    if (savedId) {
      setSearchId(savedId);
      sessionStorage.removeItem("xray_load_pax");
      
      const performSearch = async () => {
        setLoading(true);
        try {
          const pData = await apiRequest(`/patients/${savedId}`);
          setPatient(pData);
          if (pData.xray_report) {
            const xr = pData.xray_report;
            setDate(xr.date || pData.date || new Date().toISOString().split("T")[0]);
            setRemark(xr.remark || "");
            setFindings(xr.findings || "");
            setResult(xr.result || "Fit");
          } else {
            setDate(pData.date || new Date().toISOString().split("T")[0]);
            setRemark("");
            setFindings("");
            setResult("Fit");
          }
          toast.success("Patient details loaded successfully.");
        } catch (err: any) {
          console.error(err);
          toastApiError(err, "Patient not found.");
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
      setPatient(pData);
      
      // Load current xray report if it exists
      if (pData.xray_report) {
        const xr = pData.xray_report;
        setDate(xr.date || pData.date || new Date().toISOString().split("T")[0]);
        setRemark(xr.remark || "");
        setFindings(xr.findings || "");
        setResult(xr.result || "Fit");
      } else {
        setDate(pData.date || new Date().toISOString().split("T")[0]);
        setRemark("");
        setFindings("");
        setResult("Fit");
      }
      toast.success("Patient details loaded successfully.");
    } catch (err: any) {
      toastApiError(err, "Patient not found.");
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validationError = validateImageFile(xrayImageFile, { maxSizeKB: 2048 });
      if (validationError) {
        setImageError(validationError);
        throw new Error(validationError);
      }

      const formData = new FormData();
      formData.append("patient_id", patient.id);
      formData.append("date", date);
      formData.append("remark", remark);
      formData.append("findings", findings);
      formData.append("result", result);
      if (xrayImageFile) {
        formData.append("xray_image", xrayImageFile);
      }

      return apiRequest("/xray-reports", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      toast.success("X-Ray report saved successfully!");
      setFromError(null);
    },
    onError: (err: any) => {
      setFromError(err);
      // Backend rejects the image itself (bad type/size/corrupt file) via
      // the 'xray_image' validation key — surface it under the field too,
      // not just as a toast.
      if (err?.fields?.xray_image) {
        setImageError(err.fields.xray_image);
      }
      toastApiError(err, "Failed to save X-Ray report.");
    }
  });

  return (
    <DashboardShell title="X-Ray Upload" subtitle="Attach and report X-Ray findings to a patient.">
      <div className="card-surface p-6 space-y-6">
        <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
          <h3 className="font-display text-lg font-semibold">X-Ray Report Entry</h3>
          <div className="w-full sm:w-auto sm:ml-auto">
            <Label className="text-xs">Search Patient by ID</Label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="e.g. BEST000001"
                className="w-full sm:w-[240px]"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} className="w-full gradient-primary sm:w-auto" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>
          </div>
        </div>

        {patient && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Pax Id</Label><Input value={patient.pax_id} disabled /></div>
              <div>
                <Label>Date</Label>
                <DatePicker value={date} onChange={setDate} />
              </div>
              <div><Label>Country</Label><Input value={patient.country?.name || ""} disabled /></div>
              <div><Label>Name</Label><Input value={`${patient.first_name} ${patient.last_name || ""}`} disabled /></div>
              <div><Label>Sex</Label><Input value={patient.sex || ""} disabled /></div>
              <div><Label>Agency</Label><Input value={patient.agency?.name || ""} disabled /></div>
              <div><Label>Mobile No</Label><Input value={patient.mobile_no || ""} disabled /></div>
              <div><Label>Passport No</Label><Input value={patient.passport_no || ""} disabled /></div>
              
              <div className="md:col-span-2">
                <Label>Remark</Label>
                <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>X-Ray Finding</Label>
                <Textarea rows={3} value={findings} onChange={(e) => setFindings(e.target.value)} />
              </div>
              <div>
                <Label>Result / Finding Status</Label>
                <Select value={result} onValueChange={setResult}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fit">Fit</SelectItem>
                    <SelectItem value="Held up">Held up</SelectItem>
                    <SelectItem value="Unfit">Unfit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>X-Ray Image File</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => handleXrayImageChange(e.target.files?.[0] || null)}
                  />
                </div>
                <FieldError message={imageError || fieldErrors.xray_image} />
              </div>
            </div>

            {canUploadXray && (
              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <Button
                  className="gradient-primary"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !!imageError}
                >
                  {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                  Save
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
