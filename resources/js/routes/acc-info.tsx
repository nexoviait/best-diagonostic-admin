import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, Users, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/acc-info")({ component: AccInfoPage });

function AccInfoPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const physicianInputRef = useRef<HTMLInputElement>(null);
  const radiologistInputRef = useRef<HTMLInputElement>(null);
  const authorisedInputRef = useRef<HTMLInputElement>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [physicianSigFile, setPhysicianSigFile] = useState<File | null>(null);
  const [radiologistSigFile, setRadiologistSigFile] = useState<File | null>(null);
  const [authorisedSigFile, setAuthorisedSigFile] = useState<File | null>(null);
  
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [status, setStatus] = useState("1");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLogoFile(e.target.files[0]);
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
      // Update locally cached user details
      localStorage.setItem("mediadmin_user", JSON.stringify(data.user));
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile settings.");
    },
  });

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
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*"
                />
                <Button variant="outline" size="sm" className="h-9" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-1 h-4 w-4" />Logo Image upload
                </Button>
                
                {user?.logo_path && !logoFile && (
                  <div className="flex items-center gap-1.5 border border-border bg-muted/20 px-2 py-1 rounded">
                    <img src={user.logo_path} alt="Company logo" className="h-7 w-7 object-contain rounded" />
                    <span className="text-[10px] text-muted-foreground font-mono">Current Logo</span>
                  </div>
                )}
                {logoFile && (
                  <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded font-medium">
                    Selected: {logoFile.name}
                  </span>
                )}
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
                          setPhysicianSigFile(e.target.files[0]);
                        }
                      }}
                      accept="image/*"
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
                          setRadiologistSigFile(e.target.files[0]);
                        }
                      }}
                      accept="image/*"
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
                  </div>
                </div>

                {/* Authorised Signature */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-slate-700">Authorised / Accountant Signature</Label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={authorisedInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAuthorisedSigFile(e.target.files[0]);
                        }
                      }}
                      accept="image/*"
                    />
                    <Button variant="outline" size="sm" className="h-9 w-full" onClick={() => authorisedInputRef.current?.click()}>
                      <Upload className="mr-1 h-4 w-4" /> Upload Authorised Sig
                    </Button>
                    {user?.signature_authorised_path && !authorisedSigFile && (
                      <div className="flex flex-col items-center gap-1.5 border border-border bg-white p-2 rounded">
                        <img src={user.signature_authorised_path} alt="Authorised Signature" className="h-12 object-contain" />
                        <span className="text-[9px] text-muted-foreground font-mono">Current Authorised Signature</span>
                      </div>
                    )}
                    {authorisedSigFile && (
                      <span className="text-[10px] text-center text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded truncate">
                        Selected: {authorisedSigFile.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-right">
              <Button
                className="gradient-primary"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
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
