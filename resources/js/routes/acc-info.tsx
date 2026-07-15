import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, Users, Loader2, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import { FieldError } from "@/components/ui/field-error";
import { validateImageFile } from "@/lib/validate-image";
import { useFieldErrors } from "@/lib/use-field-errors";

export const Route = createFileRoute("/acc-info")({ component: AccInfoPage });

function AccInfoPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const physicianInputRef = useRef<HTMLInputElement>(null);
  const radiologistInputRef = useRef<HTMLInputElement>(null);
  const authorisedInputRef = useRef<HTMLInputElement>(null);
  const reportHeaderInputRef = useRef<HTMLInputElement>(null);
  const reportFooterInputRef = useRef<HTMLInputElement>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [physicianSigFile, setPhysicianSigFile] = useState<File | null>(null);
  const [radiologistSigFile, setRadiologistSigFile] = useState<File | null>(null);
  const [authorisedSigFile, setAuthorisedSigFile] = useState<File | null>(null);
  const [reportHeaderFile, setReportHeaderFile] = useState<File | null>(null);
  const [reportFooterFile, setReportFooterFile] = useState<File | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [status, setStatus] = useState("1");

  const [imageErrors, setImageErrors] = useState<Record<string, string | null>>({});
  const { fieldErrors, setFromError, clear } = useFieldErrors();

  const validateAndSetImage = (
    key: "logo_image" | "signature_physician" | "signature_radiologist" | "signature_authorised" | "report_header_image" | "report_footer_image",
    file: File | null,
    setter: (file: File | null) => void,
    maxSizeKB: number,
    allowedTypes?: string[]
  ) => {
    const error = validateImageFile(file, { maxSizeKB, allowedTypes });
    setImageErrors((prev) => ({ ...prev, [key]: error }));
    clear(key);
    if (!error) setter(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetImage("logo_image", e.target.files[0], setLogoFile, 3072);
    }
  };

  // Company English
  const [compNameEn, setCompNameEn] = useState("");
  const [compNameEnTitle, setCompNameEnTitle] = useState("");
  const [compAddressEn, setCompAddressEn] = useState("");
  const [compPhoneEn, setCompPhoneEn] = useState("");
  const [compPaxEn, setCompPaxEn] = useState("");

  // Company Bangla
  const [compNameBn, setCompNameBn] = useState("");
  const [compNameBnTitle, setCompNameBnTitle] = useState("");
  const [compAddressBn, setCompAddressBn] = useState("");
  const [compPhoneBn, setCompPhoneBn] = useState("");
  const [compPaxBn, setCompPaxBn] = useState("");

  // Payment edit time window (minutes). Empty = no time limit.
  const [paymentEditWindow, setPaymentEditWindow] = useState("");

  // Fetch current user details
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: () => apiRequest("/auth/me"),
  });

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername(user.username || "");
      setEmail(user.email || "");
      setMobileNo(user.mobile_no || "");
      setStatus(user.status || "1");
      
      setCompNameEn(user.company_name_en || "");
      setCompNameEnTitle(user.company_name_en_title || "");
      setCompAddressEn(user.company_address_en || "");
      setCompPhoneEn(user.company_phone_en || "");
      setCompPaxEn(user.company_pax_en || "");

      setCompNameBn(user.company_name_bn || "");
      setCompNameBnTitle(user.company_name_bn_title || "");
      setCompAddressBn(user.company_address_bn || "");
      setCompPhoneBn(user.company_phone_bn || "");
      setCompPaxBn(user.company_pax_bn || "");

      setPaymentEditWindow(
        user.payment_edit_window_minutes === null || user.payment_edit_window_minutes === undefined
          ? ""
          : String(user.payment_edit_window_minutes)
      );
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("username", username);
      formData.append("email", email);
      formData.append("mobile_no", mobileNo);
      formData.append("status", status);
      formData.append("company_name_en", compNameEn);
      formData.append("company_name_en_title", compNameEnTitle);
      formData.append("company_address_en", compAddressEn);
      formData.append("company_phone_en", compPhoneEn);
      formData.append("company_pax_en", compPaxEn);
      formData.append("company_name_bn", compNameBn);
      formData.append("company_name_bn_title", compNameBnTitle);
      formData.append("company_address_bn", compAddressBn);
      formData.append("company_phone_bn", compPhoneBn);
      formData.append("company_pax_bn", compPaxBn);
      formData.append("payment_edit_window_minutes", paymentEditWindow);

      if (logoFile) {
        formData.append("logo_image", logoFile);
      }
      if (physicianSigFile) {
        formData.append("signature_physician", physicianSigFile);
      }
      if (radiologistSigFile) {
        formData.append("signature_radiologist", radiologistSigFile);
      }
      if (authorisedSigFile) {
        formData.append("signature_authorised", authorisedSigFile);
      }
      if (reportHeaderFile) {
        formData.append("report_header_image", reportHeaderFile);
      }
      if (reportFooterFile) {
        formData.append("report_footer_image", reportFooterFile);
      }

      return apiRequest("/auth/profile", {
        method: "POST", // Spoofed method handled by match route
        body: formData,
      });
    },
    onSuccess: (data) => {
      toast.success("Site settings and signatures updated successfully!");
      setLogoFile(null);
      setPhysicianSigFile(null);
      setRadiologistSigFile(null);
      setAuthorisedSigFile(null);
      setReportHeaderFile(null);
      setReportFooterFile(null);
      setImageErrors({});
      setFromError(null);
      // Update locally cached user details
      localStorage.setItem("mediadmin_user", JSON.stringify(data.user));
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (err: any) => {
      setFromError(err);
      toastApiError(err, "Failed to update profile settings.");
    },
  });

  const removeReportImageMutation = useMutation({
    mutationFn: async (field: "report_header_image" | "report_footer_image") => {
      const formData = new FormData();
      formData.append(`remove_${field}`, "1");
      return apiRequest("/auth/profile", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (data, field) => {
      toast.success(field === "report_header_image" ? "Header image removed." : "Footer image removed.");
      if (field === "report_header_image") setReportHeaderFile(null);
      if (field === "report_footer_image") setReportFooterFile(null);
      localStorage.setItem("mediadmin_user", JSON.stringify(data.user));
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
    onError: (err: any) => {
      toastApiError(err, "Failed to remove image.");
    },
  });

  const hasImageErrors = Object.values(imageErrors).some(Boolean);

  const canManageSettings = user?.role === 'Admin' || user?.role_name === 'Superadmin' || (user?.permissions || []).includes('manage_settings');

  if (!isLoading && user && !canManageSettings) {
    return (
      <DashboardShell title="Site Settings" subtitle="Manage system user accounts, company profile, and signature configurations.">
        <div className="card-surface p-8 text-center text-red-500 font-semibold">
          Unauthorized Access
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Site Settings" subtitle="Manage system user accounts, company profile, and signature configurations.">
      {isLoading ? (
        <div className="flex items-center justify-center p-12 card-surface">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          Loading user profile settings...
        </div>
      ) : (
        <>
          <div className="card-surface p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <Label className="text-xs text-muted-foreground block mb-1">Acc User</Label>
                <Input value={username} disabled className="w-[200px] bg-muted/30 h-9" />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-auto">
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                  />
                  <Button variant="outline" size="sm" className="h-9" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-1 h-4 w-4" />Logo Image upload
                  </Button>

                  {user?.logo_path && !logoFile && (
                    <div className="mt-1 flex items-center gap-1.5 border border-border bg-muted/20 px-2 py-1 rounded">
                      <img src={user.logo_path} alt="Company logo" className="h-7 w-7 object-contain rounded" />
                      <span className="text-[10px] text-muted-foreground font-mono">Current Logo</span>
                    </div>
                  )}
                  {logoFile && (
                    <span className="mt-1 inline-block text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded font-medium">
                      Selected: {logoFile.name}
                    </span>
                  )}
                  <FieldError message={imageErrors.logo_image || fieldErrors.logo_image} />
                </div>
              </div>
              <Link to="/users" className="ml-auto">
                <Button className="gradient-primary h-9" size="sm"><Users className="mr-1 h-4 w-4" />All Users</Button>
              </Link>
            </div>
          </div>

          <div className="card-surface p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <Label>Acc Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Mobile No</Label>
                <Input value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} />
              </div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <h4 className="font-display text-sm font-semibold uppercase tracking-wide">Company in English</h4>
                <div className="mt-3 space-y-3">
                  <div>
                    <Label>Company Name</Label>
                    <Input value={compNameEn} onChange={(e) => setCompNameEn(e.target.value)} />
                  </div>
                  <div>
                    <Label>Title / Headline</Label>
                    <Input value={compNameEnTitle} onChange={(e) => setCompNameEnTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input value={compAddressEn} onChange={(e) => setCompAddressEn(e.target.value)} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={compPhoneEn} onChange={(e) => setCompPhoneEn(e.target.value)} />
                  </div>
                  <div>
                    <Label>Pax Limit</Label>
                    <Input value={compPaxEn} onChange={(e) => setCompPaxEn(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <h4 className="font-display text-sm font-semibold uppercase tracking-wide">Company in Bangla</h4>
                <div className="mt-3 space-y-3">
                  <div>
                    <Label>কোম্পানি নাম</Label>
                    <Input value={compNameBn} onChange={(e) => setCompNameBn(e.target.value)} />
                  </div>
                  <div>
                    <Label>টাইটেল / হেডলাইন</Label>
                    <Input value={compNameBnTitle} onChange={(e) => setCompNameBnTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>ঠিকানা</Label>
                    <Input value={compAddressBn} onChange={(e) => setCompAddressBn(e.target.value)} />
                  </div>
                  <div>
                    <Label>ফোন</Label>
                    <Input value={compPhoneBn} onChange={(e) => setCompPhoneBn(e.target.value)} />
                  </div>
                  <div>
                    <Label>পাক্স সীমা</Label>
                    <Input value={compPaxBn} onChange={(e) => setCompPaxBn(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Edit Time Window Section */}
            <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
              <h4 className="font-display text-sm font-semibold uppercase tracking-wide mb-1">Payment Edit Time Limit (minutes)</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Staff with the "Edit Payment" permission can only edit an entry's payment fields within this many minutes of it being created. Leave blank for no time limit. Super Admin can always edit payment fields.
              </p>
              <div className="max-w-xs">
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="No limit"
                  value={paymentEditWindow}
                  onChange={(e) => setPaymentEditWindow(e.target.value)}
                />
              </div>
            </div>

            {/* Signature Uploads Section */}
            <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
              <h4 className="font-display text-sm font-semibold uppercase tracking-wide mb-4">Upload Signature Images</h4>
              <div className="grid gap-6 md:grid-cols-3">
                {/* Physician Signature */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-slate-700">Chief Physician Signature</Label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={physicianInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          validateAndSetImage("signature_physician", e.target.files[0], setPhysicianSigFile, 2048);
                        }
                      }}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                    />
                    <Button variant="outline" size="sm" className="h-9 w-full" onClick={() => physicianInputRef.current?.click()}>
                      <Upload className="mr-1 h-4 w-4" /> Upload Physician Sig
                    </Button>
                    {user?.signature_physician_path && !physicianSigFile && (
                      <div className="flex flex-col items-center gap-1.5 border border-border bg-white p-2 rounded">
                        <img src={user.signature_physician_path} alt="Physician Signature" className="h-12 object-contain" />
                        <span className="text-[9px] text-muted-foreground font-mono">Current Physician Signature</span>
                      </div>
                    )}
                    {physicianSigFile && (
                      <span className="text-[10px] text-center text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded truncate">
                        Selected: {physicianSigFile.name}
                      </span>
                    )}
                    <FieldError message={imageErrors.signature_physician || fieldErrors.signature_physician} />
                  </div>
                </div>

                {/* Radiologist Signature */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-slate-700">Radiologist Signature</Label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={radiologistInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          validateAndSetImage("signature_radiologist", e.target.files[0], setRadiologistSigFile, 2048);
                        }
                      }}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                    />
                    <Button variant="outline" size="sm" className="h-9 w-full" onClick={() => radiologistInputRef.current?.click()}>
                      <Upload className="mr-1 h-4 w-4" /> Upload Radiologist Sig
                    </Button>
                    {user?.signature_radiologist_path && !radiologistSigFile && (
                      <div className="flex flex-col items-center gap-1.5 border border-border bg-white p-2 rounded">
                        <img src={user.signature_radiologist_path} alt="Radiologist Signature" className="h-12 object-contain" />
                        <span className="text-[9px] text-muted-foreground font-mono">Current Radiologist Signature</span>
                      </div>
                    )}
                    {radiologistSigFile && (
                      <span className="text-[10px] text-center text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded truncate">
                        Selected: {radiologistSigFile.name}
                      </span>
                    )}
                    <FieldError message={imageErrors.signature_radiologist || fieldErrors.signature_radiologist} />
                  </div>
                </div>

                {/* Authorised Signature */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-slate-700">Operator / Cashier Signature</Label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={authorisedInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          validateAndSetImage("signature_authorised", e.target.files[0], setAuthorisedSigFile, 2048);
                        }
                      }}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                    />
                    <Button variant="outline" size="sm" className="h-9 w-full" onClick={() => authorisedInputRef.current?.click()}>
                      <Upload className="mr-1 h-4 w-4" /> Upload Operator / Cashier Sig
                    </Button>
                    {user?.signature_authorised_path && !authorisedSigFile && (
                      <div className="flex flex-col items-center gap-1.5 border border-border bg-white p-2 rounded">
                        <img src={user.signature_authorised_path} alt="Operator / Cashier Signature" className="h-12 object-contain" />
                        <span className="text-[9px] text-muted-foreground font-mono">Current Operator / Cashier Signature</span>
                      </div>
                    )}
                    {authorisedSigFile && (
                      <span className="text-[10px] text-center text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded truncate">
                        Selected: {authorisedSigFile.name}
                      </span>
                    )}
                    <FieldError message={imageErrors.signature_authorised || fieldErrors.signature_authorised} />
                  </div>
                </div>
              </div>
            </div>

            {/* Report Header/Footer Image Uploads Section */}
            <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
              <h4 className="font-display text-sm font-semibold uppercase tracking-wide mb-1">Report Header &amp; Footer Images</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Optional. If uploaded, the printed medical report uses this image instead of the company name/logo header or footer. PNG, JPG, or JPEG only.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Report Header Image */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-slate-700">Report Header Image</Label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={reportHeaderInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          validateAndSetImage(
                            "report_header_image",
                            e.target.files[0],
                            setReportHeaderFile,
                            3072,
                            ["image/jpeg", "image/png"]
                          );
                        }
                      }}
                      accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    />
                    <Button variant="outline" size="sm" className="h-9 w-full" onClick={() => reportHeaderInputRef.current?.click()}>
                      <Upload className="mr-1 h-4 w-4" /> Upload Header Image
                    </Button>
                    {user?.report_header_image_path && !reportHeaderFile && (
                      <div className="flex flex-col items-center gap-1.5 border border-border bg-white p-2 rounded">
                        <img src={user.report_header_image_path} alt="Report Header" className="h-12 object-contain" />
                        <span className="text-[9px] text-muted-foreground font-mono">Current Header Image</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                          disabled={removeReportImageMutation.isPending}
                          onClick={() => removeReportImageMutation.mutate("report_header_image")}
                        >
                          <X className="mr-1 h-3 w-3" /> Remove
                        </Button>
                      </div>
                    )}
                    {reportHeaderFile && (
                      <span className="text-[10px] text-center text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded truncate">
                        Selected: {reportHeaderFile.name}
                      </span>
                    )}
                    <FieldError message={imageErrors.report_header_image || fieldErrors.report_header_image} />
                  </div>
                </div>

                {/* Report Footer Image */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-slate-700">Report Footer Image</Label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={reportFooterInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          validateAndSetImage(
                            "report_footer_image",
                            e.target.files[0],
                            setReportFooterFile,
                            3072,
                            ["image/jpeg", "image/png"]
                          );
                        }
                      }}
                      accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    />
                    <Button variant="outline" size="sm" className="h-9 w-full" onClick={() => reportFooterInputRef.current?.click()}>
                      <Upload className="mr-1 h-4 w-4" /> Upload Footer Image
                    </Button>
                    {user?.report_footer_image_path && !reportFooterFile && (
                      <div className="flex flex-col items-center gap-1.5 border border-border bg-white p-2 rounded">
                        <img src={user.report_footer_image_path} alt="Report Footer" className="h-12 object-contain" />
                        <span className="text-[9px] text-muted-foreground font-mono">Current Footer Image</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                          disabled={removeReportImageMutation.isPending}
                          onClick={() => removeReportImageMutation.mutate("report_footer_image")}
                        >
                          <X className="mr-1 h-3 w-3" /> Remove
                        </Button>
                      </div>
                    )}
                    {reportFooterFile && (
                      <span className="text-[10px] text-center text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded truncate">
                        Selected: {reportFooterFile.name}
                      </span>
                    )}
                    <FieldError message={imageErrors.report_footer_image || fieldErrors.report_footer_image} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-right">
              <Button
                className="gradient-primary"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || hasImageErrors}
              >
                {updateMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save account settings
              </Button>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
