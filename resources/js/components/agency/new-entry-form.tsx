import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Camera } from "lucide-react";

import { agencyApiRequest } from "@/lib/agency-api";
import { toastApiError } from "@/lib/toast-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";

const todayISO = () => new Date().toISOString().slice(0, 10);

const blankForm = {
  date: todayISO(),
  country_id: "",
  nationality: "BANGLADESH",
  first_name: "",
  last_name: "",
  father_name: "",
  mother_name: "",
  mobile_no: "",
  dob: "",
  sex: "",
  passport_no: "",
  visa_no: "",
  issue_date: "",
  job_applied: "",
};

type EntryForm = typeof blankForm;

function formFromPatient(patient: any): EntryForm {
  return {
    date: patient.date || todayISO(),
    country_id: patient.country_id ? String(patient.country_id) : "",
    nationality: patient.nationality || "",
    first_name: patient.first_name || "",
    last_name: patient.last_name || "",
    father_name: patient.father_name || "",
    mother_name: patient.mother_name || "",
    mobile_no: patient.mobile_no || "",
    dob: patient.dob || "",
    sex: patient.sex || "",
    passport_no: patient.passport_no || "",
    visa_no: patient.visa_no || "",
    issue_date: patient.issue_date || "",
    job_applied: patient.job_applied || "",
  };
}

interface NewEntryFormProps {
  /** When set, edits this existing entry instead of creating a new one. */
  patient?: any;
  /** Called after a successful submit. Defaults to navigating to My Entries (create mode only). */
  onSuccess?: () => void;
}

export function NewEntryForm({ patient, onSuccess }: NewEntryFormProps) {
  const isEdit = !!patient;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EntryForm>(isEdit ? formFromPatient(patient) : blankForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(patient?.image_url || null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof EntryForm) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ["agency-countries"],
    queryFn: () => agencyApiRequest("/agency/countries"),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const path = isEdit ? `/agency/patients/${patient.pax_id}` : "/agency/patients";
      if (imageFile) {
        const body = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          if (value) body.append(key, value);
        });
        if (isEdit) body.append("_method", "PUT");
        return agencyApiRequest(path, { method: "POST", body });
      }
      return agencyApiRequest(path, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
    },
    onSuccess: (res) => {
      toast.success(
        isEdit
          ? `Entry updated — ${res?.data?.pax_id ?? ""}.`
          : `Entry submitted — ${res?.data?.pax_id ?? ""}. Our office will review it shortly.`,
      );
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ["agency-my-entries"] });
      queryClient.invalidateQueries({ queryKey: ["agency-report"] });
      if (onSuccess) {
        onSuccess();
        return;
      }
      setForm(blankForm);
      setImageFile(null);
      setImagePreview(null);
      navigate({ to: "/agency-portal-entries" });
    },
    onError: (err: any) => {
      setErrors(err?.fields || {});
      toastApiError(err, isEdit ? "Failed to update entry." : "Failed to submit entry.");
    },
  });

  const canSubmit = !!form.country_id && !!form.first_name.trim();

  return (
    <>
      <h2 className="font-display text-base font-semibold">
        {isEdit ? `Edit entry — ${patient.pax_id}` : "Register a new patient"}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {isEdit
          ? "Update the patient's details below. No fingerprint, MR, or billing here — our office handles those."
          : "Fill in the patient's details below. No fingerprint, MR, or billing needed here — our office assigns the MR and completes the medical report and fees after reviewing your entry."}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Date</Label>
          <DatePicker value={form.date} onChange={set("date")} />
        </div>
        <div>
          <Label>Country *</Label>
          <Combobox
            options={countries.map((c) => ({ value: String(c.id), label: c.name }))}
            value={form.country_id}
            onChange={set("country_id")}
            placeholder="Select country"
            searchPlaceholder="Search country..."
          />
          {errors.country_id && <p className="mt-1 text-xs text-destructive">{errors.country_id}</p>}
        </div>

        <div>
          <Label>Nationality</Label>
          <Input value={form.nationality} onChange={(e) => set("nationality")(e.target.value)} />
        </div>
        <div>
          <Label>Mobile No</Label>
          <Input value={form.mobile_no} onChange={(e) => set("mobile_no")(e.target.value)} placeholder="880" />
        </div>

        <div>
          <Label>First Name *</Label>
          <Input value={form.first_name} onChange={(e) => set("first_name")(e.target.value)} />
          {errors.first_name && <p className="mt-1 text-xs text-destructive">{errors.first_name}</p>}
        </div>
        <div>
          <Label>Last Name</Label>
          <Input value={form.last_name} onChange={(e) => set("last_name")(e.target.value)} />
        </div>

        <div>
          <Label>Father's Name</Label>
          <Input value={form.father_name} onChange={(e) => set("father_name")(e.target.value)} />
        </div>
        <div>
          <Label>Mother's Name</Label>
          <Input value={form.mother_name} onChange={(e) => set("mother_name")(e.target.value)} />
        </div>

        <div>
          <Label>Date of Birth</Label>
          <DatePicker value={form.dob} onChange={set("dob")} placeholder="Pick a date" />
        </div>
        <div>
          <Label>Sex</Label>
          <Select value={form.sex} onValueChange={set("sex")}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Passport No</Label>
          <Input value={form.passport_no} onChange={(e) => set("passport_no")(e.target.value)} />
        </div>
        <div>
          <Label>Visa No</Label>
          <Input value={form.visa_no} onChange={(e) => set("visa_no")(e.target.value)} />
        </div>

        <div>
          <Label>Issue Date</Label>
          <DatePicker value={form.issue_date} onChange={set("issue_date")} placeholder="Pick a date" />
        </div>
        <div>
          <Label>Job Applied</Label>
          <Input value={form.job_applied} onChange={(e) => set("job_applied")(e.target.value)} />
        </div>

        <div>
          <Label>Photo</Label>
          <div className="flex items-center gap-3">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded-md border object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                <Camera className="h-4 w-4" />
              </div>
            )}
            <Input type="file" accept="image/*" onChange={handleImageChange} className="max-w-[220px]" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          className="gradient-primary"
          onClick={() => submitMutation.mutate()}
          disabled={!canSubmit || submitMutation.isPending}
        >
          {submitMutation.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          {isEdit ? "Save Changes" : "Submit Entry"}
        </Button>
      </div>
    </>
  );
}
