import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Camera } from "lucide-react";

import { agencyApiRequest, getAgency, setAgency } from "@/lib/agency-api";
import { toastApiError } from "@/lib/toast-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the fresh agency record right after a successful save. */
  onUpdated?: (agency: any) => void;
}

export function EditProfileDialog({ open, onOpenChange, onUpdated }: EditProfileDialogProps) {
  const agency = getAgency();
  const [form, setForm] = useState({
    contact_person: agency?.contact_person || "",
    email: agency?.email || "",
    mobile_no: agency?.mobile_no || "",
    address: agency?.address || "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(agency?.logo_url || null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const name = agency?.name || "Agency";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (logoFile) {
        const body = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          if (value) body.append(key, value);
        });
        body.append("logo", logoFile);
        body.append("_method", "PUT");
        return agencyApiRequest("/agency/profile", { method: "POST", body });
      }
      return agencyApiRequest("/agency/profile", { method: "PUT", body: JSON.stringify(form) });
    },
    onSuccess: (res) => {
      setAgency(res.agency);
      onUpdated?.(res.agency);
      toast.success("Profile updated successfully.");
      setLogoFile(null);
      setErrors({});
      onOpenChange(false);
    },
    onError: (err: any) => {
      setErrors(err?.fields || {});
      toastApiError(err, "Failed to update profile.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Agency name and login username are set by our office — contact us to change those.
        </p>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-border">
            {logoPreview && <AvatarImage src={logoPreview} alt={name} className="object-cover" />}
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent">
              <Camera className="h-3.5 w-3.5" />
              Change Photo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <Label>Contact Person</Label>
            <Input value={form.contact_person} onChange={(e) => set("contact_person")(e.target.value)} />
            {errors.contact_person && <p className="mt-1 text-xs text-destructive">{errors.contact_person}</p>}
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
          <div>
            <Label>Mobile No</Label>
            <Input value={form.mobile_no} onChange={(e) => set("mobile_no")(e.target.value)} />
            {errors.mobile_no && <p className="mt-1 text-xs text-destructive">{errors.mobile_no}</p>}
          </div>
          <div>
            <Label>Office Address</Label>
            <Input value={form.address} onChange={(e) => set("address")(e.target.value)} />
            {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address}</p>}
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="gradient-primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
