import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Printer, FileText, CreditCard, Loader2, Search, QrCode, ShieldCheck, Camera, Upload, RefreshCw, Fingerprint, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import { FieldError } from "@/components/ui/field-error";
import { validateImageFile } from "@/lib/validate-image";
import { useFieldErrors } from "@/lib/use-field-errors";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/entry-form")({ component: EntryFormPage });

const sideActions = [
  { label: "New Entry", icon: FileText },
  { label: "Card Front", icon: CreditCard },
  { label: "Card Back", icon: CreditCard },
  { label: "Report", icon: FileText },
  { label: "X-Ray Report", icon: FileText },
  { label: "Invoice", icon: FileText },
  { label: "Invoice Zero", icon: FileText },
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




function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string | null }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-start gap-3">
      <Label className="text-sm text-muted-foreground pt-2">{label}</Label>
      <div>
        {children}
        <FieldError message={error} />
      </div>
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
  const [imageError, setImageError] = useState<string | null>(null);
  const [fingerprintError, setFingerprintError] = useState<string | null>(null);
  const { fieldErrors, setFromError, clear, clearAll } = useFieldErrors();

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [fingerprintPreviewUrl, setFingerprintPreviewUrl] = useState<string | null>(null);
  const [activeCropField, setActiveCropField] = useState<"image" | "fingerprint">("image");

  // Fingerprint Scanner states
  const [isScannerDialogOpen, setIsScannerDialogOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<"detecting" | "ready" | "scanning" | "success" | "error">("detecting");
  const [scannerErrorMsg, setScannerErrorMsg] = useState<string | null>(null);

  // Dialog & Capture/Crop states
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async (deviceId?: string) => {
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setCameraActive(true);

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = allDevices.filter(d => d.kind === "videoinput");
      setDevices(videoDevs);
      if (!deviceId && videoDevs.length > 0) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Could not access camera. Please upload a file instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera(deviceId);
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCropImageSrc(dataUrl);
      stopCamera();
    }
  };

  const handleFileSelectInDialog = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCrop = () => {
    if (!imgRef.current || !cropBoxRef.current) return;
    const img = imgRef.current;
    const cropBox = cropBoxRef.current;

    const containerEl = cropBox.parentElement;
    if (!containerEl) return;
    const containerRect = containerEl.getBoundingClientRect();
    const boxRect = cropBox.getBoundingClientRect();

    const outWidth = activeCropField === "image" ? 300 : 300;
    const outHeight = activeCropField === "image" ? 400 : 300;

    const R = outWidth / boxRect.width; // Ratio of canvas output width to screen crop box width

    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // 1. Move origin to canvas center
      ctx.translate(outWidth / 2, outHeight / 2);

      // 2. Apply panned offset scaled up by R
      ctx.translate(pan.x * R, pan.y * R);

      // 3. Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // 4. Apply zoom scale
      ctx.scale(zoom, zoom);

      // 5. Calculate display size on screen at 1x zoom
      const dispHeight = containerRect.height;
      const dispWidth = dispHeight * (img.naturalWidth / img.naturalHeight);

      // Draw centered
      ctx.drawImage(
        img,
        (-dispWidth * R) / 2,
        (-dispHeight * R) / 2,
        dispWidth * R,
        dispHeight * R
      );
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], activeCropField === "image" ? "cropped-photo.jpg" : "cropped-fingerprint.jpg", { type: "image/jpeg" });
        const previewUrl = URL.createObjectURL(blob);
        if (activeCropField === "image") {
          handleImageFileChange(file);
          setImagePreviewUrl(previewUrl);
        } else {
          handleFingerprintFileChange(file);
          setFingerprintPreviewUrl(previewUrl);
        }
        setIsCropDialogOpen(false);
        toast.success(`${activeCropField === "image" ? "Image" : "Fingerprint"} cropped and set successfully.`);
      }
    }, "image/jpeg", 0.9);
  };

  useEffect(() => {
    if (isCropDialogOpen) {
      startCamera();
    } else {
      stopCamera();
      setCropImageSrc(null);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
    return () => {
      stopCamera();
    };
  }, [isCropDialogOpen]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, cameraActive]);

  const handleImageFileChange = (file: File | null) => {
    setImageError(validateImageFile(file, { maxSizeKB: 2048 }));
    setImageFile(file);
    clear("image");
  };

  const handleFingerprintFileChange = (file: File | null) => {
    setFingerprintError(validateImageFile(file, { maxSizeKB: 2048 }));
    setFingerprintFile(file);
    clear("fingerprint");
  };  const discoverActiveScannerPort = async (): Promise<{ type: "rd" | "zk"; port: number; url?: string } | null> => {
    const portsToTest = [
      { type: "rd" as const, port: 11100, path: "" },
      { type: "rd" as const, port: 11101, path: "" },
      { type: "rd" as const, port: 11102, path: "" },
      { type: "zk" as const, port: 22001, path: "/zkfinger/capture" },
      { type: "zk" as const, port: 22001, path: "/" },
      { type: "zk" as const, port: 8089, path: "/zkfinger/capture" },
      { type: "zk" as const, port: 8089, path: "/" },
      { type: "zk" as const, port: 8090, path: "/capture" },
      { type: "zk" as const, port: 8090, path: "/" },
      { type: "zk" as const, port: 8080, path: "/capture" },
      { type: "zk" as const, port: 8080, path: "/" },
      { type: "zk" as const, port: 8081, path: "/zkfinger/capture" },
      { type: "zk" as const, port: 8081, path: "/" },
      { type: "zk" as const, port: 8087, path: "/zkfinger/capture" },
      { type: "zk" as const, port: 8087, path: "/" },
      { type: "zk" as const, port: 9000, path: "/zkfinger/capture" },
      { type: "zk" as const, port: 9000, path: "/" },
      { type: "zk" as const, port: 19000, path: "/zkfinger/capture" },
      { type: "zk" as const, port: 19000, path: "/" }
    ];

    const pingPromises = portsToTest.map(async (device) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout for discovery

        const url = device.type === "rd" 
          ? `http://localhost:${device.port}` 
          : `http://localhost:${device.port}${device.path}`;

        await fetch(url, {
          method: "GET",
          mode: "no-cors", // Bypasses CORS blocks to check if the port is active!
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return { ...device, open: true };
      } catch (e: any) {
        return { ...device, open: false };
      }
    });

    const results = await Promise.all(pingPromises);
    const activeDevice = results.find(r => r.open);
    return activeDevice ? { type: activeDevice.type, port: activeDevice.port, url: activeDevice.type === "zk" ? `http://localhost:${activeDevice.port}${activeDevice.path}` : undefined } : null;
  };

  const captureFingerprintFromDevice = async () => {
    setIsScannerDialogOpen(true);
    setScannerStatus("detecting");
    setScannerErrorMsg(null);

    // Discover active port
    const activeDevice = await discoverActiveScannerPort();

    if (!activeDevice) {
      setScannerStatus("error");
      setScannerErrorMsg("Fingerprint scanner not detected. Please connect the scanner and ensure driver service is running.");
      return;
    }

    setScannerStatus("scanning");
    let capturedDataUrl: string | null = null;
    let scanSuccess = false;
    let errorDetail: string | null = null;

    try {
      if (activeDevice.type === "rd") {
        const url = `http://localhost:${activeDevice.port}/rd/capture`;
        const pidOptions = `
          <PidOptions ver="1.0">
            <Opts fCount="1" fType="0" iCount="0" pCount="0" pgCount="0" format="0" pidVer="2.0" timeout="10000" posh="UNKNOWN" env="P" />
          </PidOptions>
        `.trim();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(url, {
          method: "CAPTURE",
          body: pidOptions,
          headers: {
            "Content-Type": "text/xml",
            "Accept": "text/xml"
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const xmlText = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const respNode = xmlDoc.getElementsByTagName("Resp")[0];
          const errCode = respNode?.getAttribute("errCode");

          if (errCode === "0") {
            const dataNode = xmlDoc.getElementsByTagName("Data")[0];
            const base64Data = dataNode?.textContent?.trim();
            if (base64Data) {
              capturedDataUrl = base64Data.startsWith("data:") ? base64Data : `data:image/png;base64,${base64Data}`;
              scanSuccess = true;
            }
          } else {
            const errInfo = respNode?.getAttribute("errInfo") || "Scan failed";
            if (errCode === "-1" || errCode === "700" || errInfo.toLowerCase().includes("busy")) {
              errorDetail = "Scanner is busy. Please try again.";
            } else if (errCode === "100" || errInfo.toLowerCase().includes("timeout")) {
              errorDetail = "Scan timeout. Please place your finger on the scanner within the time limit.";
            } else if (errCode === "101" || errInfo.toLowerCase().includes("quality") || errInfo.toLowerCase().includes("poor")) {
              errorDetail = "Poor fingerprint quality. Please clean your finger and place it firmly.";
            } else if (errCode === "102" || errInfo.toLowerCase().includes("disconnected") || errInfo.toLowerCase().includes("no device")) {
              errorDetail = "Scanner disconnected. Please check the USB connection.";
            } else {
              errorDetail = `SDK communication error (Code ${errCode}): ${errInfo}`;
            }
          }
        }
      } else {
        // Custom ZK driver capture query
        const url = activeDevice.url!;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const responseText = await response.text();
          
          // Try parsing as JSON first
          try {
            const data = JSON.parse(responseText);
            const base64Data = data.image || data.data || data.bmp || data.jpg || data.png || data.base64 || data.template;
            if (base64Data) {
              capturedDataUrl = base64Data.startsWith("data:") ? base64Data : `data:image/png;base64,${base64Data}`;
              scanSuccess = true;
            } else if (data.message || data.error) {
              const msg = (data.message || data.error).toLowerCase();
              if (msg.includes("busy")) errorDetail = "Scanner is busy.";
              else if (msg.includes("timeout")) errorDetail = "Scan timeout.";
              else if (msg.includes("quality")) errorDetail = "Poor fingerprint quality.";
              else if (msg.includes("connect") || msg.includes("disconnect")) errorDetail = "Scanner disconnected.";
              else errorDetail = `SDK communication error: ${data.message || data.error}`;
            }
          } catch (jsonErr) {
            // If not JSON, try parsing as XML
            try {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(responseText, "text/xml");
              const dataNode = xmlDoc.getElementsByTagName("Data")[0] || 
                               xmlDoc.getElementsByTagName("Image")[0] || 
                               xmlDoc.getElementsByTagName("Template")[0] ||
                               xmlDoc.getElementsByTagName("Base64")[0];
              const base64Data = dataNode?.textContent?.trim();
              if (base64Data) {
                capturedDataUrl = base64Data.startsWith("data:") ? base64Data : `data:image/png;base64,${base64Data}`;
                scanSuccess = true;
              }
            } catch (xmlErr) {
              // Fallback: If it's a raw base64 string
              const trimmed = responseText.trim();
              if (trimmed.length > 100) {
                capturedDataUrl = trimmed.startsWith("data:") ? trimmed : `data:image/png;base64,${trimmed}`;
                scanSuccess = true;
              }
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        errorDetail = "Scan timeout. No response from scanner.";
      } else {
        errorDetail = `Failed to capture from device: ${e.message || e}`;
      }
    }

    if (scanSuccess && capturedDataUrl) {
      try {
        const res = await fetch(capturedDataUrl);
        const blob = await res.blob();
        const file = new File([blob], "scanner-fingerprint.png", { type: "image/png" });
        handleFingerprintFileChange(file);
        setFingerprintPreviewUrl(capturedDataUrl);
        setScannerStatus("success");
        toast.success("Fingerprint captured successfully from scanner device.");
        setTimeout(() => {
          setIsScannerDialogOpen(false);
        }, 1500);
      } catch (err) {
        console.error("Error processing captured fingerprint:", err);
        setScannerStatus("error");
        setScannerErrorMsg("Error processing scanned fingerprint file.");
      }
    } else {
      setScannerStatus("error");
      setScannerErrorMsg(
        errorDetail || "Fingerprint scanner not detected. Please connect the scanner and try again."
      );
    }
  };

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

  const { data: siteSettings } = useQuery<any>({
    queryKey: ["public-settings"],
    queryFn: () => apiRequest("/public/site-settings"),
  });

  // Payment fields have their own time-boxed permission, separate from general
  // patient-edit access: a user with 'edit_payment' can only touch payment on an
  // existing entry within the admin-configured window after it was created.
  // Superadmin/Admin always bypass this. New (unsaved) entries are never locked.
  const isSuperadmin = user?.role === 'Admin' || user?.role_name === 'Superadmin';
  const hasEditPaymentPermission = (user?.permissions || []).includes('edit_payment');
  const paymentWindowExpired = (() => {
    if (!isEditing || !activePatient?.created_at) return false;
    const windowMinutes = siteSettings?.payment_edit_window_minutes;
    if (windowMinutes === null || windowMinutes === undefined || windowMinutes === "") return false;
    const deadline = new Date(activePatient.created_at).getTime() + Number(windowMinutes) * 60000;
    return Date.now() > deadline;
  })();
  // Brand-new (unsaved) entries stay always-editable — the permission/time-window
  // gate only applies once editing an already-created record.
  const canEditPaymentNow = !isEditing || isSuperadmin || (hasEditPaymentPermission && !paymentWindowExpired);

  const dueAmount = Math.max(0, medicalFee - receivedAmount);

  useEffect(() => {
    setInWords(numberToWords(medicalFee));
  }, [medicalFee]);

  // Auto-fill the medical fee from the agency's default price, but only when
  // the user actively picks an agency for a brand-new entry (see the Agency
  // <Select> below). This used to be a useEffect watching [agencyId, agencies],
  // which also fired while editing an existing patient — any time the agencies
  // list loaded/changed after populateForm() had already set agencyId, it
  // silently overwrote the patient's real saved medical_fee.
  const handleAgencyChange = (newAgencyId: string) => {
    setAgencyId(newAgencyId);
    if (!isEditing) {
      const selected = agencies.find((a) => String(a.id) === newAgencyId);
      if (selected && selected.price) {
        setMedicalFee(Number(selected.price));
      }
    }
  };

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
    setImagePreviewUrl(p.image_url || null);
    setFingerprintPreviewUrl(p.fingerprint_url || null);
    setIsEditing(true);
    clearAll();
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
          toastApiError(err, "Patient not found.");
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
      toastApiError(err, "Patient not found.");
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
      setFromError(null);
      setImagePreviewUrl(savedPatient.image_url || null);
      setFingerprintPreviewUrl(savedPatient.fingerprint_url || null);
      clearAll();
      // Auto switch to Card Front tab to show details!
      setActiveTab("Card Front");
    },
    onError: (err: any) => {
      setFromError(err);
      if (err?.fields?.image) setImageError(err.fields.image);
      if (err?.fields?.fingerprint) setFingerprintError(err.fields.fingerprint);
      toastApiError(err, "Failed to create patient entry.");
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
      setImagePreviewUrl(updatedPatient.image_url || null);
      setFingerprintPreviewUrl(updatedPatient.fingerprint_url || null);
      setActiveTab("Card Front");
      setFromError(null);
      clearAll();
    },
    onError: (err: any) => {
      setFromError(err);
      if (err?.fields?.image) setImageError(err.fields.image);
      if (err?.fields?.fingerprint) setFingerprintError(err.fields.fingerprint);
      toastApiError(err, "Failed to update patient entry.");
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
    setImagePreviewUrl(null);
    setMedicalFee(3500); setReceivedAmount(0); setNiddleCharge(0);
    setInWords("Three Thousand Five Hundred Taka Only");
    clearAll();
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
            .header p { margin: 4px 0 0; font-size: 14px; color: #64748b; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; gap: 4px; }
            .report-title-section h3 { margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.05em; color: #0f172a; }
            .report-title-section p { margin: 4px 0 0; font-size: 14px; font-family: monospace; color: #64748b; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 16px; margin-bottom: 28px; }
            .meta-column p { margin: 8px 0; }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 28px; font-size: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th, td { padding: 12px 16px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0; color: #475569; }
            td { border-bottom: 1px solid #f1f5f9; }
            tr:last-child td { border-bottom: none; }
            .result-success { font-weight: 600; color: rgb(22, 163, 74); }
            .footer-section { display: flex; justify-content: space-between; align-items: center; margin-top: 56px; border-top: 1px solid #e2e8f0; padding-top: 24px; font-size: 16px; }
            .status { font-weight: bold; color: rgb(22, 163, 74); text-transform: uppercase; font-size: 18px; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 220px; padding-top: 6px; font-size: 14px; color: #64748b; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="try { JsBarcode(document.querySelector('.barcode-svg'), '${activePatient.pax_id}', { format: 'CODE128', width: 1.2, height: 24, displayValue: false, margin: 0 }); } catch(e) {} setTimeout(function() { window.print(); window.close(); }, 300);">
          <div class="header">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 48px; object-fit: contain;" />
                <span style="font-weight: bold; font-size: 20px; color: #0d9488;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
              </div>
              <p>${user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"} | Phone: ${user?.company_phone_en || "+8801756441699"}</p>
            </div>
            <div class="report-title-section" style="text-align: right; display: flex; flex-direction: column; align-items: end; gap: 4px; shrink-0;">
              <h3>MEDICAL CLEARANCE REPORT</h3>
              <p style="margin: 0; font-size: 14px; font-family: monospace;">ID: ${activePatient.pax_id}</p>
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
            .header p { margin: 4px 0 0; font-size: 14px; color: #64748b; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; gap: 4px; }
            .report-title-section h3 { margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.05em; color: #0f172a; }
            .report-title-section p { margin: 4px 0 0; font-size: 14px; font-family: monospace; color: #64748b; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; }
            .meta-column p { margin: 8px 0; }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            .findings-section { font-size: 16px; margin-bottom: 32px; }
            .findings-section h4 { margin: 20px 0 8px; font-weight: bold; color: #334155; font-size: 17px; }
            .findings-section p { margin: 0; line-height: 1.6; color: #475569; }
            .impression { font-weight: 600; color: rgb(22, 163, 74); font-size: 17px; }
            .footer-section { display: flex; justify-content: flex-end; margin-top: 64px; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 220px; padding-top: 6px; font-size: 14px; color: #64748b; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="try { JsBarcode(document.querySelector('.barcode-svg'), '${activePatient.pax_id}', { format: 'CODE128', width: 1.2, height: 24, displayValue: false, margin: 0 }); } catch(e) {} setTimeout(function() { window.print(); window.close(); }, 300);">
          <div class="header">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 48px; object-fit: contain;" />
                <span style="font-weight: bold; font-size: 20px; color: #0d9488;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
              </div>
              <p>Radiology & Chest Diagnostics Department</p>
            </div>
            <div class="report-title-section" style="text-align: right; display: flex; flex-direction: column; align-items: end; gap: 4px; shrink-0;">
              <h3>CHEST ROENTGENOGRAM REPORT</h3>
              <p style="margin: 0; font-size: 14px; font-family: monospace;">ID: ${activePatient.pax_id}</p>
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
              `<div class="signature" style="border-top: none;"><img src="${user.signature_radiologist_path}" style="height: 48px; object-fit: contain; display: block; margin: 0 auto 4px auto;" />Radiologist Signature</div>` : 
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
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; gap: 16px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: bold; color: oklch(0.58 0.14 180); }
            .header p { margin: 4px 0 0; font-size: 14px; color: #64748b; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; }
            .report-title-section h3 { margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.05em; color: #0f172a; }
            .report-title-section p { margin: 4px 0 0; font-size: 14px; font-family: monospace; color: #64748b; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px; }
            .meta-column p { margin: 4px 0; }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 15px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th, td { padding: 6px 12px; }
            th { background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: left; }
            td { border-bottom: 1px solid #f1f5f9; text-align: left; }
            .text-right { text-align: right; }
            tr:last-child td { border-bottom: none; }
            .total-row { font-weight: 600; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
            .success-row { font-weight: 600; color: rgb(22, 163, 74); }
            .destructive-row { font-weight: 600; color: rgb(220, 38, 38); }
            .in-words-section { font-size: 15px; margin-top: 12px; font-style: italic; }
            .in-words-section span { font-style: normal; color: #64748b; }
            .footer-section { display: flex; justify-content: space-between; align-items: end; margin-top: 24px; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 220px; padding-top: 6px; font-size: 14px; color: #64748b; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="initBarcode()">
          <div class="header">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 48px; object-fit: contain;" />
                <span style="font-weight: bold; font-size: 20px; color: #0d9488;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
              </div>
              <p>${user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
            </div>
            <div class="report-title-section" style="display: flex; flex-direction: column; align-items: flex-end; shrink-0;">
              <h3>PAYMENT RECEIPT</h3>
              <p style="margin-bottom: 6px; margin-top: 4px; font-size: 14px; color: #64748b;">Invoice Date: ${activePatient.date}</p>
              <svg id="invoice-barcode"></svg>
            </div>
            <img src="${activePatient.image_url || '/assets/images/best-logo.png'}" onerror="this.src='/assets/images/best-logo.png'" style="width: 64px; height: 80px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; shrink-0;" />
          </div>
          <div class="meta-grid">
            <div class="meta-column" style="display: flex; flex-direction: column; gap: 4px;">
              <p><span class="label" style="display: inline-block; width: 130px;">SL No.</span> <span class="value" style="font-family: monospace;">: ${activePatient.pax_id}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Name</span> <span class="value" style="text-transform: uppercase;">: ${activePatient.first_name} ${activePatient.last_name || ''}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Passport No</span> <span class="value">: ${activePatient.passport_no || ''}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Date of Birth</span> <span class="value">: ${activePatient.dob ? activePatient.dob.split('-').reverse().join('/') : ''}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Country</span> <span class="value" style="text-transform: uppercase;">: ${activePatient.country?.name || ''}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Name of Agency</span> <span class="value">: ${activePatient.agency?.name || ''}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Profession</span> <span class="value">: ${activePatient.job_applied || ''}</span></p>
            </div>
            <div class="meta-column" style="border-left: 1px dashed #cbd5e1; padding-left: 20px; display: flex; flex-direction: column; gap: 6px;">
              <p><span class="label" style="display: inline-block; width: 130px;">Reporting Date</span> <span class="value">: ${activePatient.date ? activePatient.date.split('-').reverse().join('/') : ''}</span></p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;"><span class="label" style="font-weight: 600; color: #0f172a;">BLOOD:</span><span style="width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">URINE:</span><span style="width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">STOOL:</span><span style="width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">PHYSICAL:</span><span style="width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">X-RAY:</span><span style="width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
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
          <div class="in-words-section" style="display: flex; flex-direction: column; gap: 4px;">
            <p style="margin: 0;"><span>In Words:</span> ${activePatient.in_words || numberToWords(Number(activePatient.medical_fee))}</p>
            ${activePatient.medical_report?.comments ? `<p style="margin: 4px 0 0 0; font-family: monospace; color: #334155; font-size: 11px;"><strong>Comments:</strong> ${activePatient.medical_report.comments}</p>` : ''}
          </div>
          <div class="footer-section">
            ${user?.signature_authorised_path ? 
              `<div class="signature" style="border-top: none; margin-left: auto;"><img src="${user.signature_authorised_path}" style="height: 48px; object-fit: contain; display: block; margin: 0 auto 4px auto;" />Operator / Cashier</div>` : 
              `<div class="signature" style="margin-left: auto;">Operator / Cashier</div>`
            }
          </div>
          <script>
            function initBarcode() {
              try {
                JsBarcode('#invoice-barcode', '${activePatient.pax_id}', {
                  format: 'CODE128',
                  width: 1.8,
                  height: 38,
                  displayValue: true,
                  fontSize: 12,
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
    } else if (activeTab === "Invoice Zero") {
      html = `
        <html>
        <head>
          <title>Invoice Zero - ${activePatient.pax_id}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; gap: 16px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: bold; color: oklch(0.58 0.14 180); }
            .header p { margin: 4px 0 0; font-size: 14px; color: #64748b; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; }
            .report-title-section h3 { margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.05em; color: #0f172a; }
            .report-title-section p { margin: 4px 0 0; font-size: 14px; font-family: monospace; color: #64748b; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 12px; }
            .meta-column p { margin: 4px 0; }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 15px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th, td { padding: 6px 12px; }
            th { background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: left; }
            td { border-bottom: 1px solid #f1f5f9; text-align: left; }
            .text-right { text-align: right; }
            tr:last-child td { border-bottom: none; }
            .total-row { font-weight: 600; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
            .success-row { font-weight: 600; color: rgb(22, 163, 74); }
            .normal-row { font-weight: 600; color: #64748b; }
            .in-words-section { font-size: 15px; margin-top: 12px; font-style: italic; }
            .in-words-section span { font-style: normal; color: #64748b; }
            .footer-section { display: flex; justify-content: space-between; align-items: end; margin-top: 24px; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 220px; padding-top: 6px; font-size: 14px; color: #64748b; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="initBarcode()">
          <div class="header">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 48px; object-fit: contain;" />
                <span style="font-weight: bold; font-size: 20px; color: #0d9488;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
              </div>
              <p>${user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
            </div>
            <div class="report-title-section" style="display: flex; flex-direction: column; align-items: flex-end; shrink-0;">
              <h3>PAYMENT RECEIPT</h3>
              <p style="margin-bottom: 6px; margin-top: 4px; font-size: 14px; color: #64748b;">Invoice Date: ${activePatient.date}</p>
              <svg id="invoice-barcode"></svg>
            </div>
            <img src="${activePatient.image_url || '/assets/images/best-logo.png'}" onerror="this.src='/assets/images/best-logo.png'" style="width: 64px; height: 80px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; shrink-0;" />
          </div>
          <div class="meta-grid">
            <div class="meta-column" style="display: flex; flex-direction: column; gap: 4px;">
              <p><span class="label" style="display: inline-block; width: 130px;">SL No.</span> <span class="value" style="font-family: monospace;">: ${activePatient.pax_id}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Name</span> <span class="value" style="text-transform: uppercase;">: ${activePatient.first_name} ${activePatient.last_name || ''}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Passport No</span> <span class="value">: ${activePatient.passport_no || ''}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Date of Birth</span> <span class="value">: ${activePatient.dob ? activePatient.dob.split('-').reverse().join('/') : ''}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Country</span> <span class="value" style="text-transform: uppercase;">: ${activePatient.country?.name || ''}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Name of Agency</span> <span class="value">: ${activePatient.agency?.name || ''}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Profession</span> <span class="value">: ${activePatient.job_applied || ''}</span></p>
            </div>
            <div class="meta-column" style="border-left: 1px dashed #cbd5e1; padding-left: 20px; display: flex; flex-direction: column; gap: 6px;">
              <p><span class="label" style="display: inline-block; width: 130px;">Reporting Date</span> <span class="value">: ${activePatient.date ? activePatient.date.split('-').reverse().join('/') : ''}</span></p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;"><span class="label" style="font-weight: 600; color: #0f172a;">BLOOD:</span><span style="width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">URINE:</span><span style="width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">STOOL:</span><span style="width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">PHYSICAL:</span><span style="width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">X-RAY:</span><span style="width: 12px; height: 12px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
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
                <td class="text-right">0</td>
              </tr>
              <tr class="total-row">
                <td>Total Amount Due</td>
                <td class="text-right">0</td>
              </tr>
              <tr class="success-row">
                <td>Amount Paid</td>
                <td class="text-right">0</td>
              </tr>
              <tr class="normal-row">
                <td>Dues Outstanding</td>
                <td class="text-right">0</td>
              </tr>
            </tbody>
          </table>
          <div class="in-words-section" style="display: flex; flex-direction: column; gap: 4px;">
            <p style="margin: 0;"><span>In Words:</span> Zero Taka Only</p>
            ${activePatient.medical_report?.comments ? `<p style="margin: 4px 0 0 0; font-family: monospace; color: #334155; font-size: 11px;"><strong>Comments:</strong> ${activePatient.medical_report.comments}</p>` : ''}
          </div>
          <div class="footer-section">
            ${user?.signature_authorised_path ? 
              `<div class="signature" style="border-top: none; margin-left: auto;"><img src="${user.signature_authorised_path}" style="height: 48px; object-fit: contain; display: block; margin: 0 auto 4px auto;" />Operator / Cashier</div>` : 
              `<div class="signature" style="margin-left: auto;">Operator / Cashier</div>`
            }
          </div>
          <script>
            function initBarcode() {
              try {
                JsBarcode('#invoice-barcode', '${activePatient.pax_id}', {
                  format: 'CODE128',
                  width: 1.8,
                  height: 38,
                  displayValue: true,
                  fontSize: 12,
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
                <Field label="Date" error={fieldErrors.date}>
                  <DatePicker
                    value={date}
                    onChange={(val) => {
                      setDate(val);
                      clear("date");
                    }}
                    className={cn(fieldErrors.date && "border-red-500 ring-red-500")}
                  />
                </Field>
                <Field label="Patient ID">
                  <Input placeholder={isEditing && activePatient ? activePatient.pax_id : "Auto Generated"} disabled />
                </Field>

                <Field label="Country" error={fieldErrors.country_id}>
                  <Select
                    value={countryId}
                    onValueChange={(val) => {
                      setCountryId(val);
                      clear("country_id");
                    }}
                  >
                    <SelectTrigger className={cn(fieldErrors.country_id && "border-red-500 ring-red-500")}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Nationality" error={fieldErrors.nationality}>
                  <Input
                    value={nationality}
                    onChange={(e) => {
                      setNationality(e.target.value);
                      clear("nationality");
                    }}
                    className={cn(fieldErrors.nationality && "border-red-500 ring-red-500")}
                  />
                </Field>
                <Field label="First Name" error={fieldErrors.first_name}>
                  <Input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      clear("first_name");
                    }}
                    className={cn(fieldErrors.first_name && "border-red-500 ring-red-500")}
                  />
                </Field>
                <Field label="Last Name" error={fieldErrors.last_name}>
                  <Input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      clear("last_name");
                    }}
                    className={cn(fieldErrors.last_name && "border-red-500 ring-red-500")}
                  />
                </Field>
                <Field label="Father's Name" error={fieldErrors.father_name}>
                  <Input
                    value={fatherName}
                    onChange={(e) => {
                      setFatherName(e.target.value);
                      clear("father_name");
                    }}
                    className={cn(fieldErrors.father_name && "border-red-500 ring-red-500")}
                  />
                </Field>
                <Field label="Mother's Name" error={fieldErrors.mother_name}>
                  <Input
                    value={motherName}
                    onChange={(e) => {
                      setMotherName(e.target.value);
                      clear("mother_name");
                    }}
                    className={cn(fieldErrors.mother_name && "border-red-500 ring-red-500")}
                  />
                </Field>
                <Field label="Mobile No" error={fieldErrors.mobile_no}>
                  <Input
                    value={mobileNo}
                    onChange={(e) => {
                      setMobileNo(e.target.value);
                      clear("mobile_no");
                    }}
                    className={cn(fieldErrors.mobile_no && "border-red-500 ring-red-500")}
                  />
                </Field>
                <Field label="Date of Birth" error={fieldErrors.dob}>
                  <DatePicker
                    value={dob}
                    onChange={(val) => {
                      setDob(val);
                      clear("dob");
                    }}
                    className={cn(fieldErrors.dob && "border-red-500 ring-red-500")}
                  />
                </Field>

                <Field label="Sex" error={fieldErrors.sex}>
                  <Select
                    value={sex}
                    onValueChange={(val) => {
                      setSex(val);
                      clear("sex");
                    }}
                  >
                    <SelectTrigger className={cn(fieldErrors.sex && "border-red-500 ring-red-500")}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Passport No" error={fieldErrors.passport_no}>
                  <Input
                    value={passportNo}
                    onChange={(e) => {
                      setPassportNo(e.target.value);
                      clear("passport_no");
                    }}
                    className={cn(fieldErrors.passport_no && "border-red-500 ring-red-500")}
                  />
                </Field>
                <Field label="Visa No" error={fieldErrors.visa_no}>
                  <Input
                    value={visaNo}
                    onChange={(e) => {
                      setVisaNo(e.target.value);
                      clear("visa_no");
                    }}
                    className={cn(fieldErrors.visa_no && "border-red-500 ring-red-500")}
                  />
                </Field>
                <Field label="Issue Date" error={fieldErrors.issue_date}>
                  <DatePicker
                    value={issueDate}
                    onChange={(val) => {
                      setIssueDate(val);
                      clear("issue_date");
                    }}
                    className={cn(fieldErrors.issue_date && "border-red-500 ring-red-500")}
                  />
                </Field>
                <Field label="Job Applied" error={fieldErrors.job_applied}>
                  <Input
                    value={jobApplied}
                    onChange={(e) => {
                      setJobApplied(e.target.value);
                      clear("job_applied");
                    }}
                    className={cn(fieldErrors.job_applied && "border-red-500 ring-red-500")}
                  />
                </Field>

                <Field label="Agency" error={fieldErrors.agency_id}>
                  <Select
                    value={agencyId}
                    onValueChange={(val) => {
                      handleAgencyChange(val);
                      clear("agency_id");
                    }}
                  >
                    <SelectTrigger className={cn(fieldErrors.agency_id && "border-red-500 ring-red-500")}>
                      <SelectValue placeholder="Select agency" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="MR" error={fieldErrors.mr_id}>
                  <Select
                    value={mrId}
                    onValueChange={(val) => {
                      setMrId(val);
                      clear("mr_id");
                    }}
                  >
                    <SelectTrigger className={cn(fieldErrors.mr_id && "border-red-500 ring-red-500")}>
                      <SelectValue placeholder="Select MR" />
                    </SelectTrigger>
                    <SelectContent>
                      {mrs.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Image" error={imageError || fieldErrors.image}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-20 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {imagePreviewUrl ? (
                        <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-slate-400">No Image</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-9 flex items-center gap-2",
                        (imageError || fieldErrors.image) && "border-red-500 text-red-500"
                      )}
                      onClick={() => {
                        setActiveCropField("image");
                        setIsCropDialogOpen(true);
                      }}
                    >
                      <Camera className="h-4 w-4" />
                      Upload / Capture Image
                    </Button>
                  </div>
                </Field>

                <Field label="Fingerprint" error={fingerprintError || fieldErrors.fingerprint}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-20 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {fingerprintPreviewUrl ? (
                        <img src={fingerprintPreviewUrl} alt="Fingerprint Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-slate-400">No Print</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-9 flex items-center gap-2",
                        (fingerprintError || fieldErrors.fingerprint) && "border-red-500 text-red-500"
                      )}
                      onClick={captureFingerprintFromDevice}
                    >
                      <Camera className="h-4 w-4" />
                      Upload / Capture Fingerprint
                    </Button>
                  </div>
                </Field>
              </div>

              <div className="mt-8 border-t border-border/60 pt-6">
                <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                  <Field label="Medical Fee" error={fieldErrors.medical_fee}>
                    <Input
                      type="number"
                      value={medicalFee}
                      disabled={!canEditPaymentNow}
                      onChange={(e) => {
                        setMedicalFee(Number(e.target.value));
                        clear("medical_fee");
                      }}
                      className={cn(fieldErrors.medical_fee && "border-red-500 ring-red-500")}
                    />
                  </Field>
                  <Field label="Received" error={fieldErrors.received_amount}>
                    <Input
                      type="number"
                      value={receivedAmount}
                      disabled={!canEditPaymentNow}
                      onChange={(e) => {
                        setReceivedAmount(Number(e.target.value));
                        clear("received_amount");
                      }}
                      className={cn(fieldErrors.received_amount && "border-red-500 ring-red-500")}
                    />
                  </Field>
                  <Field label="Dues">
                    <Input type="number" value={dueAmount} disabled />
                  </Field>
                  <Field label="Needle Charge" error={fieldErrors.niddle_charge}>
                    <Input
                      type="number"
                      value={niddleCharge}
                      disabled={!canEditPaymentNow}
                      onChange={(e) => {
                        setNiddleCharge(Number(e.target.value));
                        clear("niddle_charge");
                      }}
                      className={cn(fieldErrors.niddle_charge && "border-red-500 ring-red-500")}
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="In Words" error={fieldErrors.in_words}>
                      <Input
                        placeholder="Amount in words…"
                        value={inWords}
                        disabled={!canEditPaymentNow}
                        onChange={(e) => {
                          setInWords(e.target.value);
                          clear("in_words");
                        }}
                        className={cn(fieldErrors.in_words && "border-red-500 ring-red-500")}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {canAddPatient && (
                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    className="gradient-primary"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || updateMutation.isPending || !!imageError || !!fingerprintError}
                  >
                    {(saveMutation.isPending || updateMutation.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    {isEditing ? "Update entry" : "Save entry"}
                  </Button>
                </div>
              )}
            </div>
          )}

      {/* Camera Capture and Image Crop Dialog */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="max-w-md w-full p-6 flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {activeCropField === "image" ? "Upload or Capture Patient Image" : "Upload or Capture Fingerprint"}
            </DialogTitle>
            <DialogDescription>
              {!cropImageSrc 
                ? (activeCropField === "image" ? "Align the camera or upload a file from your device." : "Align the scanner / camera or upload a fingerprint image.")
                : `Pan and zoom the image to crop. Target size: ${activeCropField === "image" ? "300x400 (3:4 aspect ratio)" : "300x300 (1:1 aspect ratio)"}.`
              }
            </DialogDescription>
          </DialogHeader>

          {!cropImageSrc ? (
            <div className="flex flex-col gap-4">
              {/* Camera view */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover scale-x-[-1]",
                    !cameraActive && "hidden"
                  )}
                />
                {!cameraActive && (
                  <div className="text-center text-slate-500 p-4">
                    <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Camera / Scanner is offline</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {cameraActive ? "Restart Device" : "Turn on Device"}
                </Button>
                {cameraActive && (
                  <Button
                    type="button"
                    onClick={handleCapture}
                    className="flex-1 gradient-primary"
                  >
                    Capture Image
                  </Button>
                )}
              </div>

              {/* Camera selection dropdown if cameras exist */}
              {devices.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Select Scanner / Camera Device</Label>
                  <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {devices.map((device, idx) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Device ${idx + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">or</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* File picker */}
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png"
                  onChange={handleFileSelectInDialog}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {activeCropField === "image" ? "Select Image File from Device" : "Select Fingerprint Image from Device"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Cropping UI */}
              <div 
                className="relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setIsDragging(true);
                  dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                }}
                onPointerMove={(e) => {
                  if (!isDragging) return;
                  setPan({
                    x: e.clientX - dragStart.current.x,
                    y: e.clientY - dragStart.current.y
                  });
                }}
                onPointerUp={() => setIsDragging(false)}
              >
                {/* Scaled and panned image */}
                <img
                  ref={imgRef}
                  src={cropImageSrc}
                  alt="Crop Target"
                  className="max-w-none max-h-none pointer-events-none origin-center"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                    transition: isDragging ? "none" : "transform 0.1s ease-out",
                    width: "auto",
                    height: "100%",
                  }}
                  onLoad={() => {
                    setPan({ x: 0, y: 0 });
                    setZoom(1);
                    setRotation(0);
                  }}
                />

                {/* Dark semi-transparent mask with a 3:4 aspect ratio cutout */}
                <div className="absolute inset-0 pointer-events-none bg-black/60 flex items-center justify-center">
                  <div 
                    ref={cropBoxRef}
                    className="w-[180px] h-[240px] border-2 border-white rounded shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
                  />
                </div>
              </div>

              {/* Zoom & Rotation controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Zoom</span>
                    <span>{zoom.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.02"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Rotation</span>
                    <span>{rotation}°</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="h-7 text-xs px-2 shrink-0 flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      +90°
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCropImageSrc(null);
                    startCamera(selectedDeviceId);
                  }}
                  className="flex-1"
                >
                  Retake / Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveCrop}
                  className="flex-1 gradient-primary font-semibold"
                >
                  Save Cropped Image
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fingerprint Scanner Capture Dialog */}
      <Dialog open={isScannerDialogOpen} onOpenChange={setIsScannerDialogOpen}>
        <DialogContent className="max-w-md w-full p-6 flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Fingerprint Scanner Capture</DialogTitle>
            <DialogDescription>
              Interact with your physical fingerprint scanner device.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-slate-50 min-h-[200px]">
            {scannerStatus === "detecting" && (
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-semibold">Detecting connected fingerprint scanner device...</p>
                <p className="text-xs text-muted-foreground">Checking USB connections and drivers...</p>
              </div>
            )}

            {scannerStatus === "scanning" && (
              <div className="flex flex-col items-center gap-3 text-center animate-pulse">
                <Fingerprint className="h-14 w-14 text-primary" />
                <p className="text-sm font-semibold text-primary">Please place your finger on the fingerprint scanner.</p>
                <p className="text-xs text-muted-foreground">Scanning fingerprint... Please hold still.</p>
              </div>
            )}

            {scannerStatus === "success" && (
              <div className="flex flex-col items-center gap-3 text-center text-success">
                <CheckCircle2 className="h-12 w-12" />
                <p className="text-sm font-semibold">Fingerprint captured successfully!</p>
              </div>
            )}

            {scannerStatus === "error" && (
              <div className="flex flex-col items-center gap-3 text-center w-full">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Capture Failed</p>
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md w-full max-h-[100px] overflow-y-auto">
                  {scannerErrorMsg}
                </div>
                {scannerErrorMsg && scannerErrorMsg.includes("not detected") && (
                  <div className="mt-1 flex flex-col items-center gap-2 border border-dashed rounded-md p-3 bg-slate-50 w-full">
                    <p className="text-[11px] text-muted-foreground font-medium">To run the scanner on this PC, download and run the bridge utility:</p>
                    <a
                      href="/drivers/ZK4500_Web_Bridge.exe"
                      download
                      className="inline-flex items-center justify-center rounded-md text-xs font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 py-1.5 shadow"
                    >
                      Download Scanner Bridge (EXE)
                    </a>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={captureFingerprintFromDevice}
                  className="mt-2 text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry Scan / Connection
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsScannerDialogOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                        <img src={user?.logo_path || "/assets/images/best-logo.png"} alt="Logo" className="h-12 object-contain" />
                        <span className="font-bold text-base text-primary">{user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                      </div>
                      <p className="text-xs text-slate-500">{user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"} | Phone: {user?.company_phone_en || "+8801756441699"}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <h3 className="font-bold text-base">MEDICAL CLEARANCE REPORT</h3>
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

                  <div className="grid grid-cols-2 gap-4 text-sm">
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
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-left">
                          <th className="px-4 py-2 font-semibold">Laboratory Findings</th>
                          <th className="px-4 py-2 font-semibold">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr><td className="px-4 py-2 font-medium">HIV 1 & 2 Antibody</td><td className="px-4 py-2 text-success font-semibold">Negative</td></tr>
                        <tr><td className="px-4 py-2 font-medium">HBsAg (Hepatitis B)</td><td className="px-4 py-2 text-success font-semibold">Negative</td></tr>
                        <tr><td className="px-4 py-2 font-medium">Anti-HCV (Hepatitis C)</td><td className="px-4 py-2 text-success font-semibold">Negative</td></tr>
                        <tr><td className="px-4 py-2 font-medium">VDRL / TPHA</td><td className="px-4 py-2 text-success font-semibold">Negative</td></tr>
                        <tr><td className="px-4 py-2 font-medium">Chest X-Ray Examination</td><td className="px-4 py-2 text-success font-semibold">Normal Findings</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-8 border-t border-slate-100 text-sm">
                    <div>
                      <p className="font-semibold uppercase text-success flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4" /> STATUS: {activePatient.medical_report?.final_status || "FIT"}
                      </p>
                    </div>
                    <div className="text-center w-48 border-t border-slate-300 pt-2 text-xs text-slate-500">
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
                        <img src={user?.logo_path || "/assets/images/best-logo.png"} alt="Logo" className="h-12 object-contain" />
                        <span className="font-bold text-base text-primary">{user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                      </div>
                      <p className="text-xs text-slate-500">Radiology & Chest Diagnostics Department</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <h3 className="font-bold text-base">CHEST ROENTGENOGRAM REPORT</h3>
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

                  <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                    <p><span className="text-slate-500">Patient:</span> <span className="font-semibold">{activePatient.first_name} {activePatient.last_name || ""}</span></p>
                    <p><span className="text-slate-500">Passport:</span> <span className="font-mono">{activePatient.passport_no || "N/A"}</span></p>
                    <p><span className="text-slate-500">X-Ray Date:</span> <span>{activePatient.date}</span></p>
                    <p><span className="text-slate-500">Position:</span> <span>PA View</span></p>
                  </div>

                  <div className="text-sm space-y-4">
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

                  <div className="flex justify-end pt-6 text-sm">
                    <div className="text-center w-48 border-t border-slate-300 pt-2 text-xs text-slate-500 flex flex-col items-center">
                      {user?.signature_radiologist_path && (
                        <img src={user.signature_radiologist_path} className="h-12 w-auto object-contain mb-1" alt="Radiologist Signature" />
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
                        <img src={user?.logo_path || "/assets/images/best-logo.png"} alt="Logo" className="h-12 object-contain" />
                        <span className="font-bold text-base text-primary">{user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                      </div>
                      <p className="text-xs text-slate-500">{user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
                    </div>
                    <div className="text-right text-sm flex flex-col items-end gap-1 shrink-0">
                      <h3 className="font-bold text-base">PAYMENT RECEIPT</h3>
                      <p className="font-mono text-sm text-slate-500 mb-1">Invoice Date: {activePatient.date}</p>
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

                  <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <p><span className="text-slate-500 font-medium">SL No.:</span> <span className="font-mono font-bold">{activePatient.pax_id}</span></p>
                      <p><span className="text-slate-500 font-medium">Name:</span> <span className="font-semibold uppercase">{activePatient.first_name} {activePatient.last_name || ""}</span></p>
                      <p><span className="text-slate-500 font-medium">Passport No:</span> <span className="font-semibold">{activePatient.passport_no || "N/A"}</span></p>
                      <p><span className="text-slate-500 font-medium">Date of Birth:</span> <span className="font-semibold">{activePatient.dob ? activePatient.dob.split("-").reverse().join("/") : "N/A"}</span></p>
                      <p><span className="text-slate-500 font-medium">Country:</span> <span className="font-semibold uppercase">{activePatient.country?.name || "N/A"}</span></p>
                      <p><span className="text-slate-500 font-medium">Name of Agency:</span> <span className="font-semibold">{activePatient.agency?.name || "N/A"}</span></p>
                      <p><span className="text-slate-500 font-medium">Profession:</span> <span className="font-semibold">{activePatient.job_applied || "N/A"}</span></p>
                    </div>
                    <div className="border-l border-dashed border-slate-200 pl-4 space-y-1.5 font-medium">
                      <div className="flex justify-between items-center text-xs text-slate-500 pb-1 border-b border-dashed border-slate-100">
                        <span>Reporting Date:</span>
                        <span>{activePatient.date ? activePatient.date.split("-").reverse().join("/") : ""}</span>
                      </div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold text-xs">BLOOD:</span><span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold text-xs">URINE:</span><span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold text-xs">STOOL:</span><span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold text-xs">PHYSICAL:</span><span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold text-xs">X-RAY:</span><span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span></div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
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

                  <div className="text-sm space-y-2">
                    <p className="italic"><span className="text-slate-500 not-italic">In Words:</span> {activePatient.in_words || numberToWords(Number(activePatient.medical_fee))}</p>
                    {activePatient.medical_report?.comments && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-mono"><strong className="text-slate-500 not-italic">Comments:</strong> {activePatient.medical_report.comments}</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-6 text-sm">
                    <div className="text-center w-48 border-t border-slate-300 pt-2 text-xs text-slate-500 flex flex-col items-center">
                      {user?.signature_authorised_path && (
                        <img src={user.signature_authorised_path} className="h-12 w-auto object-contain mb-1" alt="Authorised Signature" />
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

          {/* TAB 6.5: Invoice Zero receipt template */}
          {activeTab === "Invoice Zero" && (
            <div className="p-4 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-6 font-sans">
              {activePatient ? (
                <>
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={user?.logo_path || "/assets/images/best-logo.png"} alt="Logo" className="h-12 object-contain" />
                        <span className="font-bold text-base text-primary">{user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                      </div>
                      <p className="text-xs text-slate-500">{user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
                    </div>
                    <div className="text-right text-sm flex flex-col items-end gap-1 shrink-0">
                      <h3 className="font-bold text-base">PAYMENT RECEIPT</h3>
                      <p className="font-mono text-sm text-slate-500 mb-1">Invoice Date: {activePatient.date}</p>
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

                  <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <p><span className="text-slate-500 font-medium">SL No.:</span> <span className="font-mono font-bold">{activePatient.pax_id}</span></p>
                      <p><span className="text-slate-500 font-medium">Name:</span> <span className="font-semibold uppercase">{activePatient.first_name} {activePatient.last_name || ""}</span></p>
                      <p><span className="text-slate-500 font-medium">Passport No:</span> <span className="font-semibold">{activePatient.passport_no || "N/A"}</span></p>
                      <p><span className="text-slate-500 font-medium">Date of Birth:</span> <span className="font-semibold">{activePatient.dob ? activePatient.dob.split("-").reverse().join("/") : "N/A"}</span></p>
                      <p><span className="text-slate-500 font-medium">Country:</span> <span className="font-semibold uppercase">{activePatient.country?.name || "N/A"}</span></p>
                      <p><span className="text-slate-500 font-medium">Name of Agency:</span> <span className="font-semibold">{activePatient.agency?.name || "N/A"}</span></p>
                      <p><span className="text-slate-500 font-medium">Profession:</span> <span className="font-semibold">{activePatient.job_applied || "N/A"}</span></p>
                    </div>
                    <div className="border-l border-dashed border-slate-200 pl-4 space-y-1.5 font-medium">
                      <div className="flex justify-between items-center text-xs text-slate-500 pb-1 border-b border-dashed border-slate-100">
                        <span>Reporting Date:</span>
                        <span>{activePatient.date ? activePatient.date.split("-").reverse().join("/") : ""}</span>
                      </div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold text-xs">BLOOD:</span><span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold text-xs">URINE:</span><span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold text-xs">STOOL:</span><span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold text-xs">PHYSICAL:</span><span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold text-xs">X-RAY:</span><span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span></div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
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
                          <td className="px-4 py-2 text-right">0</td>
                        </tr>
                        <tr className="font-semibold bg-slate-50 border-t border-slate-200">
                          <td className="px-4 py-2">Total Amount Due</td>
                          <td className="px-4 py-2 text-right">0</td>
                        </tr>
                        <tr className="font-semibold text-success">
                          <td className="px-4 py-2">Amount Paid</td>
                          <td className="px-4 py-2 text-right">0</td>
                        </tr>
                        <tr className="font-semibold text-slate-500">
                          <td className="px-4 py-2">Dues Outstanding</td>
                          <td className="px-4 py-2 text-right">0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="text-sm space-y-2">
                    <p className="italic"><span className="text-slate-500 not-italic">In Words:</span> Zero Taka Only</p>
                    {activePatient.medical_report?.comments && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-mono"><strong className="text-slate-500 not-italic">Comments:</strong> {activePatient.medical_report.comments}</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-6 text-sm">
                    <div className="text-center w-48 border-t border-slate-300 pt-2 text-xs text-slate-500 flex flex-col items-center">
                      {user?.signature_authorised_path && (
                        <img src={user.signature_authorised_path} className="h-12 w-auto object-contain mb-1" alt="Authorised Signature" />
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