import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Save,
    Printer,
    FileText,
    Loader2,
    Search,
    Camera,
    Upload,
    RefreshCw,
    Fingerprint,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/entry-form")({
    component: EntryFormPage,
});

const sideActions = [
    { label: "New Entry", icon: FileText },
    { label: "Invoice", icon: FileText },
    { label: "Invoice Zero", icon: FileText },
    { label: "Label Print", icon: Printer },
];

function BarcodePreview({
    value,
    displayValue = false,
    height = 22,
}: {
    value: string;
    displayValue?: boolean;
    height?: number;
}) {
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

    return (
        <svg
            ref={svgRef}
            className="mx-auto"
            style={{ maxHeight: displayValue ? "45px" : "28px" }}
        />
    );
}

function Field({
    label,
    children,
    error,
}: {
    label: string;
    children: React.ReactNode;
    error?: string | null;
}) {
    return (
        <div className="grid grid-cols-[130px_1fr] items-start gap-3">
            <Label className="text-sm text-muted-foreground pt-2">
                {label}
            </Label>
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
    const a = [
        "",
        "One ",
        "Two ",
        "Three ",
        "Four ",
        "Five ",
        "Six ",
        "Seven ",
        "Eight ",
        "Nine ",
        "Ten ",
        "Eleven ",
        "Twelve ",
        "Thirteen ",
        "Fourteen ",
        "Fifteen ",
        "Sixteen ",
        "Seventeen ",
        "Eighteen ",
        "Nineteen ",
    ];
    const b = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ];

    const convert = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100)
            return (
                b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "")
            );
        if (n < 1000)
            return (
                a[Math.floor(n / 100)] +
                "Hundred " +
                (n % 100 !== 0 ? "and " + convert(n % 100) : "")
            );
        if (n < 100000)
            return (
                convert(Math.floor(n / 1000)) +
                "Thousand " +
                (n % 1000 !== 0 ? convert(n % 1000) : "")
            );
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
    const [fingerprintError, setFingerprintError] = useState<string | null>(
        null,
    );
    const { fieldErrors, setFromError, clear, clearAll } = useFieldErrors();

    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [fingerprintPreviewUrl, setFingerprintPreviewUrl] = useState<
        string | null
    >(null);
    const [activeCropField, setActiveCropField] = useState<
        "image" | "fingerprint"
    >("image");

    // Fingerprint Scanner states (driven by the local ZK4500 WebSocket bridge)
    const [isScannerDialogOpen, setIsScannerDialogOpen] = useState(false);
    const [scannerStatus, setScannerStatus] = useState<
        "disconnected" | "connecting" | "connected" | "scanning" | "error"
    >("disconnected");
    const [scannerErrorMsg, setScannerErrorMsg] = useState<string | null>(
        null,
    );
    const [scannerLivePreview, setScannerLivePreview] = useState<
        string | null
    >(null);
    const [captureJustSucceeded, setCaptureJustSucceeded] = useState(false);
    const [fingerprintTemplate, setFingerprintTemplate] = useState<
        string | null
    >(null);
    const [fingerprintQuality, setFingerprintQuality] = useState<
        number | null
    >(null);
    const scannerWsRef = useRef<WebSocket | null>(null);
    const scannerArmedRef = useRef(false);

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
                stream.getTracks().forEach((t) => t.stop());
            }
            const constraints: MediaStreamConstraints = {
                video: deviceId
                    ? { deviceId: { exact: deviceId } }
                    : { facingMode: "user" },
            };
            const newStream =
                await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            setCameraActive(true);

            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevs = allDevices.filter((d) => d.kind === "videoinput");
            setDevices(videoDevs);
            if (!deviceId && videoDevs.length > 0) {
                setSelectedDeviceId(videoDevs[0].deviceId);
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast.error(
                "Could not access camera. Please upload a file instead.",
            );
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((t) => t.stop());
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

    const handleFileSelectInDialog = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
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
            const dispWidth =
                dispHeight * (img.naturalWidth / img.naturalHeight);

            // Draw centered
            ctx.drawImage(
                img,
                (-dispWidth * R) / 2,
                (-dispHeight * R) / 2,
                dispWidth * R,
                dispHeight * R,
            );
        }

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    const file = new File(
                        [blob],
                        activeCropField === "image"
                            ? "cropped-photo.jpg"
                            : "cropped-fingerprint.jpg",
                        { type: "image/jpeg" },
                    );
                    const previewUrl = URL.createObjectURL(blob);
                    if (activeCropField === "image") {
                        handleImageFileChange(file);
                        setImagePreviewUrl(previewUrl);
                    } else {
                        handleFingerprintFileChange(file);
                        setFingerprintPreviewUrl(previewUrl);
                    }
                    setIsCropDialogOpen(false);
                    toast.success(
                        `${activeCropField === "image" ? "Image" : "Fingerprint"} cropped and set successfully.`,
                    );
                }
            },
            "image/jpeg",
            0.9,
        );
    };

    useEffect(() => {
        if (isCropDialogOpen) {
            if (activeCropField === "image") {
                startCamera();
            }
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
    };

    // The local ZK4500 bridge always listens on this fixed port; it auto-detects
    // and auto-connects to the scanner on its own, we just reflect its status.
    const SCANNER_WS_URL = "ws://127.0.0.1:8765";
    const scannerReconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    const scheduleScannerReconnect = () => {
        if (scannerReconnectTimer.current) return;
        scannerReconnectTimer.current = setTimeout(() => {
            scannerReconnectTimer.current = null;
            connectScannerWs();
        }, 3000);
    };

    const connectScannerWs = () => {
        const existing = scannerWsRef.current;
        if (
            existing &&
            (existing.readyState === WebSocket.OPEN ||
                existing.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }

        let ws: WebSocket;
        try {
            ws = new WebSocket(SCANNER_WS_URL);
        } catch {
            scheduleScannerReconnect();
            return;
        }
        scannerWsRef.current = ws;

        ws.onopen = () => {
            if (scannerArmedRef.current) {
                ws.send(JSON.stringify({ action: "arm" }));
            }
        };

        ws.onmessage = (event) => {
            let msg: any;
            try {
                msg = JSON.parse(event.data);
            } catch {
                return;
            }

            if (msg.type === "status") {
                setScannerStatus(msg.status);
                setScannerErrorMsg(
                    msg.status === "error" || msg.status === "disconnected"
                        ? msg.message || null
                        : null,
                );
                if (msg.status !== "scanning") {
                    setScannerLivePreview(null);
                }
            } else if (msg.type === "preview") {
                setScannerLivePreview(msg.image);
            } else if (msg.type === "capture") {
                setScannerLivePreview(null);
                fetch(msg.image)
                    .then((res) => res.blob())
                    .then((blob) => {
                        const file = new File(
                            [blob],
                            "scanner-fingerprint.png",
                            { type: "image/png" },
                        );
                        handleFingerprintFileChange(file);
                        setFingerprintPreviewUrl(msg.image);
                        setFingerprintTemplate(msg.template || null);
                        setFingerprintQuality(
                            typeof msg.quality === "number"
                                ? msg.quality
                                : null,
                        );
                        setCaptureJustSucceeded(true);
                        toast.success(
                            `Fingerprint captured (quality ${msg.quality ?? "N/A"}%).`,
                        );
                        setTimeout(() => {
                            setCaptureJustSucceeded(false);
                            setIsScannerDialogOpen(false);
                        }, 1500);
                    })
                    .catch(() => {
                        toast.error(
                            "Error processing captured fingerprint image.",
                        );
                    });
            }
        };

        ws.onclose = () => {
            if (scannerWsRef.current === ws) {
                scannerWsRef.current = null;
            }
            setScannerStatus("disconnected");
            setScannerLivePreview(null);
            scheduleScannerReconnect();
        };

        ws.onerror = () => {
            ws.close();
        };
    };

    // Keep a live connection to the scanner bridge for as long as this page is
    // open, so scanner status is always current — not just while the capture
    // dialog is open.
    useEffect(() => {
        connectScannerWs();
        return () => {
            if (scannerReconnectTimer.current) {
                clearTimeout(scannerReconnectTimer.current);
                scannerReconnectTimer.current = null;
            }
            scannerWsRef.current?.close();
            scannerWsRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Arm/disarm live finger detection based on whether the capture dialog is
    // open — no button press is needed once armed, the bridge auto-captures.
    useEffect(() => {
        scannerArmedRef.current = isScannerDialogOpen;
        const ws = scannerWsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
                JSON.stringify({
                    action: isScannerDialogOpen ? "arm" : "disarm",
                }),
            );
        } else if (isScannerDialogOpen) {
            connectScannerWs();
        }
        if (!isScannerDialogOpen) {
            setScannerLivePreview(null);
            setCaptureJustSucceeded(false);
        }
    }, [isScannerDialogOpen]);

    const retryScannerConnection = () => {
        const ws = scannerWsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "arm" }));
        } else {
            connectScannerWs();
        }
    };

    // Financials
    const [medicalFee, setMedicalFee] = useState<number | string>("");
    const [receivedAmount, setReceivedAmount] = useState<number | string>("");
    const [niddleCharge, setNiddleCharge] = useState<number | string>("");
    const [inWords, setInWords] = useState("");

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
        enabled:
            typeof window !== "undefined" &&
            !!localStorage.getItem("mediadmin_token"),
    });
    const canAddPatient =
        user?.role === "Admin" ||
        user?.role_name === "Superadmin" ||
        (user?.permissions || []).includes("add_patient");
    const canPrintCard =
        user?.role === "Admin" ||
        user?.role_name === "Superadmin" ||
        (user?.permissions || []).includes("print_patient_card");

    const { data: siteSettings } = useQuery<any>({
        queryKey: ["public-settings"],
        queryFn: () => apiRequest("/public/site-settings"),
    });

    // Payment fields have their own time-boxed permission, separate from general
    // patient-edit access: a user with 'edit_payment' can only touch payment on an
    // existing entry within the admin-configured window after it was created.
    // Superadmin/Admin always bypass this. New (unsaved) entries are never locked.
    const isSuperadmin =
        user?.role === "Admin" || user?.role_name === "Superadmin";
    const hasEditPaymentPermission = (user?.permissions || []).includes(
        "edit_payment",
    );
    const paymentWindowExpired = (() => {
        if (!isEditing || !activePatient?.created_at) return false;
        const windowMinutes = siteSettings?.payment_edit_window_minutes;
        if (
            windowMinutes === null ||
            windowMinutes === undefined ||
            windowMinutes === ""
        )
            return false;
        const deadline =
            new Date(activePatient.created_at).getTime() +
            Number(windowMinutes) * 60000;
        return Date.now() > deadline;
    })();
    // Brand-new (unsaved) entries stay always-editable — the permission/time-window
    // gate only applies once editing an already-created record.
    const canEditPaymentNow =
        !isEditing ||
        isSuperadmin ||
        (hasEditPaymentPermission && !paymentWindowExpired);

    const dueAmount = medicalFee === "" ? "" : Math.max(0, Number(medicalFee) - (receivedAmount === "" ? 0 : Number(receivedAmount)));

    useEffect(() => {
        if (medicalFee === "" || Number(medicalFee) === 0) {
            setInWords("");
        } else {
            setInWords(numberToWords(Number(medicalFee)));
        }
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
        setMedicalFee(p.medical_fee !== null && p.medical_fee !== undefined && p.medical_fee !== "" ? Number(p.medical_fee) : "");
        setReceivedAmount(p.received_amount !== null && p.received_amount !== undefined && p.received_amount !== "" && Number(p.received_amount) !== 0 ? Number(p.received_amount) : "");
        setNiddleCharge(p.niddle_charge !== null && p.niddle_charge !== undefined && p.niddle_charge !== "" && Number(p.niddle_charge) !== 0 ? Number(p.niddle_charge) : "");
        setInWords(p.in_words || (p.medical_fee ? numberToWords(Number(p.medical_fee)) : ""));
        setImageFile(null);
        setFingerprintFile(null);
        setImagePreviewUrl(p.image_url || null);
        setFingerprintPreviewUrl(p.fingerprint_url || null);
        setFingerprintTemplate(null);
        setFingerprintQuality(null);
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
            toast.success(
                `Patient entry created successfully! ID is ${savedPatient.pax_id}`,
            );
            setActivePatient(savedPatient);
            setIsEditing(true);
            setFromError(null);
            setImagePreviewUrl(savedPatient.image_url || null);
            setFingerprintPreviewUrl(savedPatient.fingerprint_url || null);
            clearAll();
            // Auto switch to Invoice tab to show details!
            setActiveTab("Invoice");
        },
        onError: (err: any) => {
            setFromError(err);
            if (err?.fields?.image) setImageError(err.fields.image);
            if (err?.fields?.fingerprint)
                setFingerprintError(err.fields.fingerprint);
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
                        date,
                        country_id: countryId,
                        nationality,
                        first_name: firstName,
                        last_name: lastName,
                        father_name: fatherName,
                        mother_name: motherName,
                        mobile_no: mobileNo,
                        dob,
                        sex,
                        passport_no: passportNo,
                        visa_no: visaNo,
                        issue_date: issueDate,
                        job_applied: jobApplied,
                        agency_id: agencyId,
                        mr_id: mrId,
                        medical_fee: medicalFee === "" ? 0 : Number(medicalFee),
                        received_amount: receivedAmount === "" ? 0 : Number(receivedAmount),
                        niddle_charge: niddleCharge === "" ? 0 : Number(niddleCharge),
                        in_words: inWords,
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
            setActiveTab("Invoice");
            setFromError(null);
            clearAll();
        },
        onError: (err: any) => {
            setFromError(err);
            if (err?.fields?.image) setImageError(err.fields.image);
            if (err?.fields?.fingerprint)
                setFingerprintError(err.fields.fingerprint);
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
        formData.append("medical_fee", String(medicalFee === "" ? 0 : medicalFee));
        formData.append("received_amount", String(receivedAmount === "" ? 0 : receivedAmount));
        formData.append("due_amount", String(dueAmount === "" ? 0 : dueAmount));
        formData.append("niddle_charge", String(niddleCharge === "" ? 0 : niddleCharge));
        formData.append("in_words", inWords);
        if (imageFile) {
            formData.append("image", imageFile);
        }
        if (fingerprintFile) {
            formData.append("fingerprint", fingerprintFile);
        }
        if (fingerprintTemplate) {
            formData.append("fingerprint_template", fingerprintTemplate);
        }
        if (fingerprintQuality !== null) {
            formData.append(
                "fingerprint_quality",
                String(fingerprintQuality),
            );
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
        setCountryId("");
        setNationality("BANGLADESH");
        setFirstName("");
        setLastName("");
        setFatherName("");
        setMotherName("");
        setMobileNo("880");
        setDob("");
        setSex("");
        setPassportNo("");
        setVisaNo("");
        setIssueDate("");
        setJobApplied("");
        setAgencyId("");
        setMrId("");
        setImageFile(null);
        setFingerprintFile(null);
        setImagePreviewUrl(null);
        setFingerprintTemplate(null);
        setFingerprintQuality(null);
        setMedicalFee("");
        setReceivedAmount("");
        setNiddleCharge("");
        setInWords("");
        clearAll();
        setActiveTab("New Entry");
    };

    const handlePrint = () => {
        if (!activePatient) {
            toast.error("Please load or select a patient first.");
            return;
        }

        if (activeTab === "New Entry") {
            toast.error(
                "Please select a document tab (e.g. Invoice, Label Print) to print.",
            );
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        let html = "";

        if (activeTab === "Invoice") {
            html = `
        <html>
        <head>
          <title>Invoice - ${activePatient.pax_id}</title>
          <style>
            @page { size: portrait; margin: 6mm 8mm; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            html, body { width: 100%; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #0f172a; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; gap: 12px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: bold; color: oklch(0.58 0.14 180); }
            .header p { margin: 4px 0 0; font-size: 11px; color: #64748b; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; }
            .report-title-section h3 { margin: 0; font-size: 13px; font-weight: bold; letter-spacing: 0.05em; color: #0f172a; }
            .report-title-section p { margin: 4px 0 0; font-size: 14px; font-family: monospace; color: #64748b; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px; }
            .meta-column p { margin: 1px 0; }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th, td { padding: 3px 10px; }
            th { background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: left; }
            td { border-bottom: 1px solid #f1f5f9; text-align: left; }
            .text-right { text-align: right; }
            tr:last-child td { border-bottom: none; }
            .total-row { font-weight: 600; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
            .success-row { font-weight: 600; color: rgb(22, 163, 74); }
            .destructive-row { font-weight: 600; color: rgb(220, 38, 38); }
            .in-words-section { font-size: 13px; margin-top: 6px; font-style: italic; }
            .in-words-section span { font-style: normal; color: #64748b; }
            .footer-section { display: flex; justify-content: space-between; align-items: end; margin-top: 6px; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 180px; padding-top: 4px; font-size: 12px; color: #64748b; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="initBarcode()">
          <div class="header">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 38px; object-fit: contain;" />
                <div style="display: flex; flex-direction: column; line-height: 1.15;">
                  <span style="font-weight: bold; font-size: 18px; color: #dc2626; white-space: nowrap;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                  ${user?.company_name_bn ? `<span style="font-weight: bold; font-size: 13px; color: #19A54B; white-space: nowrap;">${user.company_name_bn}</span>` : ""}
                </div>
              </div>
              <p>${user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
            </div>
            <div class="report-title-section" style="display: flex; flex-direction: column; align-items: flex-end; shrink-0;">
              <h3>PAYMENT RECEIPT</h3>
              <p style="margin-bottom: 3px; margin-top: 3px; font-size: 11px; color: #64748b;">Invoice Date: ${activePatient.date}</p>
              <svg id="invoice-barcode"></svg>
            </div>
            <img src="${activePatient.image_url || "/assets/images/best-logo.png"}" onerror="this.src='/assets/images/best-logo.png'" style="width: 46px; height: 58px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; shrink-0;" />
          </div>
          <div class="meta-grid">
            <div class="meta-column" style="display: flex; flex-direction: column; gap: 2px;">
              <p><span class="label" style="display: inline-block; width: 130px;">SL No.</span> <span class="value" style="font-family: monospace;">: ${activePatient.pax_id}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Name</span> <span class="value" style="text-transform: uppercase;">: ${activePatient.first_name} ${activePatient.last_name || ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Father's Name</span> <span class="value">: ${activePatient.father_name || ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Passport No</span> <span class="value">: ${activePatient.passport_no || ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Date of Birth</span> <span class="value">: ${activePatient.dob ? activePatient.dob.split("-").reverse().join("/") : ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Country</span> <span class="value" style="text-transform: uppercase;">: ${activePatient.country?.name || ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Name of Agency</span> <span class="value">: ${activePatient.agency?.name || ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Profession</span> <span class="value">: ${activePatient.job_applied || ""}</span></p>
            </div>
            <div class="meta-column" style="border-left: 1px dashed #cbd5e1; padding-left: 20px; display: flex; flex-direction: column; gap: 3px;">
              <p><span class="label" style="display: inline-block; width: 130px;">Reporting Date</span> <span class="value">: ${activePatient.date ? activePatient.date.split("-").reverse().join("/") : ""}</span></p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;"><span class="label" style="font-weight: 600; color: #0f172a;">BLOOD:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">URINE:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">STOOL:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">PHYSICAL:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">X-RAY:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
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
              ${
                  Number(activePatient.niddle_charge) > 0
                      ? `
              <tr>
                <td>Needle Charge</td>
                <td class="text-right">${(Number(activePatient.niddle_charge) || 0).toLocaleString()}</td>
              </tr>
              `
                      : ""
              }
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
          <div class="in-words-section" style="display: flex; flex-direction: column; gap: 2px;">
            <p style="margin: 0;"><span>In Words:</span> ${activePatient.in_words || numberToWords(Number(activePatient.medical_fee))}</p>
            ${activePatient.medical_report?.comments ? `<p style="margin: 4px 0 0 0; font-family: monospace; color: #334155; font-size: 11px;"><strong>Comments:</strong> ${activePatient.medical_report.comments}</p>` : ""}
          </div>
          <div class="footer-section">
            ${
                user?.signature_authorised_path
                    ? `<div class="signature" style="border-top: none; margin-left: auto;"><img src="${user.signature_authorised_path}" style="height: 36px; object-fit: contain; display: block; margin: 0 auto 2px auto;" />Operator / Cashier</div>`
                    : `<div class="signature" style="margin-left: auto;">Operator / Cashier</div>`
            }
          </div>
          <script>
            function initBarcode() {
              try {
                JsBarcode('#invoice-barcode', '${activePatient.pax_id}', {
                  format: 'CODE128',
                  width: 1.3,
                  height: 24,
                  displayValue: true,
                  fontSize: 9,
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
            @page { size: portrait; margin: 6mm 8mm; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            html, body { width: 100%; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #0f172a; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; gap: 12px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: bold; color: oklch(0.58 0.14 180); }
            .header p { margin: 4px 0 0; font-size: 11px; color: #64748b; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; }
            .report-title-section h3 { margin: 0; font-size: 13px; font-weight: bold; letter-spacing: 0.05em; color: #0f172a; }
            .report-title-section p { margin: 4px 0 0; font-size: 14px; font-family: monospace; color: #64748b; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px; }
            .meta-column p { margin: 1px 0; }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th, td { padding: 3px 10px; }
            th { background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: left; }
            td { border-bottom: 1px solid #f1f5f9; text-align: left; }
            .text-right { text-align: right; }
            tr:last-child td { border-bottom: none; }
            .total-row { font-weight: 600; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
            .success-row { font-weight: 600; color: rgb(22, 163, 74); }
            .normal-row { font-weight: 600; color: #64748b; }
            .in-words-section { font-size: 13px; margin-top: 6px; font-style: italic; }
            .in-words-section span { font-style: normal; color: #64748b; }
            .footer-section { display: flex; justify-content: space-between; align-items: end; margin-top: 6px; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 180px; padding-top: 4px; font-size: 12px; color: #64748b; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="initBarcode()">
          <div class="header">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 38px; object-fit: contain;" />
                <div style="display: flex; flex-direction: column; line-height: 1.15;">
                  <span style="font-weight: bold; font-size: 18px; color: #dc2626; white-space: nowrap;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                  ${user?.company_name_bn ? `<span style="font-weight: bold; font-size: 13px; color: #19A54B; white-space: nowrap;">${user.company_name_bn}</span>` : ""}
                </div>
              </div>
              <p>${user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
            </div>
            <div class="report-title-section" style="display: flex; flex-direction: column; align-items: flex-end; shrink-0;">
              <h3>PAYMENT RECEIPT</h3>
              <p style="margin-bottom: 3px; margin-top: 3px; font-size: 11px; color: #64748b;">Invoice Date: ${activePatient.date}</p>
              <svg id="invoice-barcode"></svg>
            </div>
            <img src="${activePatient.image_url || "/assets/images/best-logo.png"}" onerror="this.src='/assets/images/best-logo.png'" style="width: 46px; height: 58px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; shrink-0;" />
          </div>
          <div class="meta-grid">
            <div class="meta-column" style="display: flex; flex-direction: column; gap: 2px;">
              <p><span class="label" style="display: inline-block; width: 130px;">SL No.</span> <span class="value" style="font-family: monospace;">: ${activePatient.pax_id}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Name</span> <span class="value" style="text-transform: uppercase;">: ${activePatient.first_name} ${activePatient.last_name || ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Father's Name</span> <span class="value">: ${activePatient.father_name || ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Passport No</span> <span class="value">: ${activePatient.passport_no || ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Date of Birth</span> <span class="value">: ${activePatient.dob ? activePatient.dob.split("-").reverse().join("/") : ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Country</span> <span class="value" style="text-transform: uppercase;">: ${activePatient.country?.name || ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Name of Agency</span> <span class="value">: ${activePatient.agency?.name || ""}</span></p>
              <p><span class="label" style="display: inline-block; width: 130px;">Profession</span> <span class="value">: ${activePatient.job_applied || ""}</span></p>
            </div>
            <div class="meta-column" style="border-left: 1px dashed #cbd5e1; padding-left: 20px; display: flex; flex-direction: column; gap: 3px;">
              <p><span class="label" style="display: inline-block; width: 130px;">Reporting Date</span> <span class="value">: ${activePatient.date ? activePatient.date.split("-").reverse().join("/") : ""}</span></p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;"><span class="label" style="font-weight: 600; color: #0f172a;">BLOOD:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">URINE:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">STOOL:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">PHYSICAL:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
              <div style="display: flex; justify-content: space-between; align-items: center;"><span class="label" style="font-weight: 600; color: #0f172a;">X-RAY:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block; margin-right: 20px;"></span></div>
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
          <div class="in-words-section" style="display: flex; flex-direction: column; gap: 2px;">
            <p style="margin: 0;"><span>In Words:</span> Zero Taka Only</p>
            ${activePatient.medical_report?.comments ? `<p style="margin: 4px 0 0 0; font-family: monospace; color: #334155; font-size: 11px;"><strong>Comments:</strong> ${activePatient.medical_report.comments}</p>` : ""}
          </div>
          <div class="footer-section">
            ${
                user?.signature_authorised_path
                    ? `<div class="signature" style="border-top: none; margin-left: auto;"><img src="${user.signature_authorised_path}" style="height: 36px; object-fit: contain; display: block; margin: 0 auto 2px auto;" />Operator / Cashier</div>`
                    : `<div class="signature" style="margin-left: auto;">Operator / Cashier</div>`
            }
          </div>
          <script>
            function initBarcode() {
              try {
                JsBarcode('#invoice-barcode', '${activePatient.pax_id}', {
                  format: 'CODE128',
                  width: 1.3,
                  height: 24,
                  displayValue: true,
                  fontSize: 9,
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
            const name =
                `${activePatient.first_name} ${activePatient.last_name || ""}`
                    .toUpperCase()
                    .trim();
            const dateStr = activePatient.date || "";

            const pageWidth = "40mm";
            const pageHeight = "30mm";

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
      <body>${Array.from({ length: labelCount })
          .map(() =>
              `
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
      `.trim(),
          )
          .join("")}
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
        <DashboardShell
            title="Entry Form"
            subtitle="Register patient entries and preview documents."
        >
            {/* Top search bar to load existing records */}
            <div className="card-surface p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Active Patient:
                    </Label>
                    <span className="font-semibold text-primary font-mono">
                        {activePatient
                            ? `${activePatient.first_name} (${activePatient.pax_id})`
                            : "None (Register new or search)"}
                    </span>
                    {isEditing && (
                        <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground uppercase tracking-wide">
                            Edit Mode
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    {isEditing && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleNewEntry}
                        >
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
                    <Button
                        size="sm"
                        onClick={handleSearch}
                        disabled={searchLoading}
                    >
                        {searchLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Search className="h-3 w-3" />
                        )}
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
                                <Button
                                    className="gradient-primary shadow-md"
                                    onClick={handlePrint}
                                    disabled={!activePatient}
                                >
                                    <Printer className="mr-2 h-4 w-4" /> Print
                                    Document
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
                            <h3 className="font-display text-base font-semibold mb-4">
                                Patient Medical Registration
                            </h3>
                            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                                <Field label="Date" error={fieldErrors.date}>
                                    <DatePicker
                                        value={date}
                                        onChange={(val) => {
                                            setDate(val);
                                            clear("date");
                                        }}
                                        className={cn(
                                            fieldErrors.date &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>
                                <Field label="Patient ID">
                                    <Input
                                        placeholder={
                                            isEditing && activePatient
                                                ? activePatient.pax_id
                                                : "Auto Generated"
                                        }
                                        disabled
                                    />
                                </Field>

                                <Field
                                    label="Country"
                                    error={fieldErrors.country_id}
                                >
                                    <Select
                                        value={countryId}
                                        onValueChange={(val) => {
                                            setCountryId(val);
                                            clear("country_id");
                                        }}
                                    >
                                        <SelectTrigger
                                            className={cn(
                                                fieldErrors.country_id &&
                                                    "border-red-500 ring-red-500",
                                            )}
                                        >
                                            <SelectValue placeholder="Select country" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countries.map((c) => (
                                                <SelectItem
                                                    key={c.id}
                                                    value={String(c.id)}
                                                >
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field
                                    label="Nationality"
                                    error={fieldErrors.nationality}
                                >
                                    <Input
                                        value={nationality}
                                        onChange={(e) => {
                                            setNationality(e.target.value);
                                            clear("nationality");
                                        }}
                                        className={cn(
                                            fieldErrors.nationality &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="First Name"
                                    error={fieldErrors.first_name}
                                >
                                    <Input
                                        placeholder="First name"
                                        value={firstName}
                                        onChange={(e) => {
                                            setFirstName(e.target.value);
                                            clear("first_name");
                                        }}
                                        className={cn(
                                            fieldErrors.first_name &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="Last Name"
                                    error={fieldErrors.last_name}
                                >
                                    <Input
                                        placeholder="Last name"
                                        value={lastName}
                                        onChange={(e) => {
                                            setLastName(e.target.value);
                                            clear("last_name");
                                        }}
                                        className={cn(
                                            fieldErrors.last_name &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="Father's Name"
                                    error={fieldErrors.father_name}
                                >
                                    <Input
                                        value={fatherName}
                                        onChange={(e) => {
                                            setFatherName(e.target.value);
                                            clear("father_name");
                                        }}
                                        className={cn(
                                            fieldErrors.father_name &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="Mother's Name"
                                    error={fieldErrors.mother_name}
                                >
                                    <Input
                                        value={motherName}
                                        onChange={(e) => {
                                            setMotherName(e.target.value);
                                            clear("mother_name");
                                        }}
                                        className={cn(
                                            fieldErrors.mother_name &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="Mobile No"
                                    error={fieldErrors.mobile_no}
                                >
                                    <Input
                                        value={mobileNo}
                                        onChange={(e) => {
                                            setMobileNo(e.target.value);
                                            clear("mobile_no");
                                        }}
                                        className={cn(
                                            fieldErrors.mobile_no &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="Date of Birth"
                                    error={fieldErrors.dob}
                                >
                                    <DatePicker
                                        value={dob}
                                        onChange={(val) => {
                                            setDob(val);
                                            clear("dob");
                                        }}
                                        className={cn(
                                            fieldErrors.dob &&
                                                "border-red-500 ring-red-500",
                                        )}
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
                                        <SelectTrigger
                                            className={cn(
                                                fieldErrors.sex &&
                                                    "border-red-500 ring-red-500",
                                            )}
                                        >
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">
                                                Male
                                            </SelectItem>
                                            <SelectItem value="Female">
                                                Female
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field
                                    label="Passport No"
                                    error={fieldErrors.passport_no}
                                >
                                    <Input
                                        value={passportNo}
                                        onChange={(e) => {
                                            setPassportNo(e.target.value);
                                            clear("passport_no");
                                        }}
                                        className={cn(
                                            fieldErrors.passport_no &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="Visa No"
                                    error={fieldErrors.visa_no}
                                >
                                    <Input
                                        value={visaNo}
                                        onChange={(e) => {
                                            setVisaNo(e.target.value);
                                            clear("visa_no");
                                        }}
                                        className={cn(
                                            fieldErrors.visa_no &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="Issue Date"
                                    error={fieldErrors.issue_date}
                                >
                                    <DatePicker
                                        value={issueDate}
                                        onChange={(val) => {
                                            setIssueDate(val);
                                            clear("issue_date");
                                        }}
                                        className={cn(
                                            fieldErrors.issue_date &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="Job Applied"
                                    error={fieldErrors.job_applied}
                                >
                                    <Input
                                        value={jobApplied}
                                        onChange={(e) => {
                                            setJobApplied(e.target.value);
                                            clear("job_applied");
                                        }}
                                        className={cn(
                                            fieldErrors.job_applied &&
                                                "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>

                                <Field
                                    label="Agency"
                                    error={fieldErrors.agency_id}
                                >
                                    <Select
                                        value={agencyId}
                                        onValueChange={(val) => {
                                            handleAgencyChange(val);
                                            clear("agency_id");
                                        }}
                                    >
                                        <SelectTrigger
                                            className={cn(
                                                fieldErrors.agency_id &&
                                                    "border-red-500 ring-red-500",
                                            )}
                                        >
                                            <SelectValue placeholder="Select agency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {agencies.map((a) => (
                                                <SelectItem
                                                    key={a.id}
                                                    value={String(a.id)}
                                                >
                                                    {a.name}
                                                </SelectItem>
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
                                        <SelectTrigger
                                            className={cn(
                                                fieldErrors.mr_id &&
                                                    "border-red-500 ring-red-500",
                                            )}
                                        >
                                            <SelectValue placeholder="Select MR" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {mrs.map((m) => (
                                                <SelectItem
                                                    key={m.id}
                                                    value={String(m.id)}
                                                >
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field
                                    label="Image"
                                    error={imageError || fieldErrors.image}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-20 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                                            {imagePreviewUrl ? (
                                                <img
                                                    src={imagePreviewUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-[10px] text-slate-400">
                                                    No Image
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "h-9 flex items-center gap-2",
                                                (imageError ||
                                                    fieldErrors.image) &&
                                                    "border-red-500 text-red-500",
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

                                <Field
                                    label="Fingerprint"
                                    error={
                                        fingerprintError ||
                                        fieldErrors.fingerprint
                                    }
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-20 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                                            {fingerprintPreviewUrl ? (
                                                <img
                                                    src={fingerprintPreviewUrl}
                                                    alt="Fingerprint Preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <span className="text-[10px] text-slate-400">
                                                    No Print
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    "h-9 flex items-center gap-2",
                                                    (fingerprintError ||
                                                        fieldErrors.fingerprint) &&
                                                        "border-red-500 text-red-500",
                                                )}
                                                onClick={() =>
                                                    setIsScannerDialogOpen(
                                                        true,
                                                    )
                                                }
                                            >
                                                <Fingerprint className="h-4 w-4" />
                                                Scan Fingerprint
                                            </Button>
                                            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                <span
                                                    className={cn(
                                                        "h-1.5 w-1.5 rounded-full",
                                                        scannerStatus ===
                                                            "connected" &&
                                                            "bg-emerald-500",
                                                        scannerStatus ===
                                                            "scanning" &&
                                                            "bg-blue-500 animate-pulse",
                                                        scannerStatus ===
                                                            "connecting" &&
                                                            "bg-amber-400 animate-pulse",
                                                        scannerStatus ===
                                                            "disconnected" &&
                                                            "bg-slate-400",
                                                        scannerStatus ===
                                                            "error" &&
                                                            "bg-red-500",
                                                    )}
                                                />
                                                {scannerStatus === "connected" &&
                                                    "Scanner ready"}
                                                {scannerStatus === "scanning" &&
                                                    "Scanning..."}
                                                {scannerStatus ===
                                                    "connecting" &&
                                                    "Connecting..."}
                                                {scannerStatus ===
                                                    "disconnected" &&
                                                    "Scanner disconnected"}
                                                {scannerStatus === "error" &&
                                                    "Scanner error"}
                                            </span>
                                            <button
                                                type="button"
                                                className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground text-left"
                                                onClick={() => {
                                                    setActiveCropField(
                                                        "fingerprint",
                                                    );
                                                    setIsCropDialogOpen(true);
                                                }}
                                            >
                                                Upload image instead
                                            </button>
                                        </div>
                                    </div>
                                </Field>
                            </div>

                            <div className="mt-8 border-t border-border/60 pt-6">
                                <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                                    <Field
                                        label="Medical Fee"
                                        error={fieldErrors.medical_fee}
                                    >
                                        <Input
                                            type="number"
                                            value={medicalFee}
                                            disabled={!canEditPaymentNow}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setMedicalFee(val === "" ? "" : Number(val));
                                                clear("medical_fee");
                                            }}
                                            className={cn(
                                                fieldErrors.medical_fee &&
                                                    "border-red-500 ring-red-500",
                                            )}
                                        />
                                    </Field>
                                    <Field
                                        label="Received"
                                        error={fieldErrors.received_amount}
                                    >
                                        <Input
                                            type="number"
                                            value={receivedAmount}
                                            disabled={!canEditPaymentNow}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setReceivedAmount(val === "" ? "" : Number(val));
                                                clear("received_amount");
                                            }}
                                            className={cn(
                                                fieldErrors.received_amount &&
                                                    "border-red-500 ring-red-500",
                                            )}
                                        />
                                    </Field>
                                    <Field label="Dues">
                                        <Input
                                            type="number"
                                            value={dueAmount}
                                            disabled
                                        />
                                    </Field>
                                    <Field
                                        label="Needle Charge"
                                        error={fieldErrors.niddle_charge}
                                    >
                                        <Input
                                            type="number"
                                            value={niddleCharge}
                                            disabled={!canEditPaymentNow}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setNiddleCharge(val === "" ? "" : Number(val));
                                                clear("niddle_charge");
                                            }}
                                            className={cn(
                                                fieldErrors.niddle_charge &&
                                                    "border-red-500 ring-red-500",
                                            )}
                                        />
                                    </Field>
                                    <div className="md:col-span-2">
                                        <Field
                                            label="In Words"
                                            error={fieldErrors.in_words}
                                        >
                                            <Input
                                                placeholder="Amount in words…"
                                                value={inWords}
                                                disabled={!canEditPaymentNow}
                                                onChange={(e) => {
                                                    setInWords(e.target.value);
                                                    clear("in_words");
                                                }}
                                                className={cn(
                                                    fieldErrors.in_words &&
                                                        "border-red-500 ring-red-500",
                                                )}
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
                                        disabled={
                                            saveMutation.isPending ||
                                            updateMutation.isPending ||
                                            !!imageError ||
                                            !!fingerprintError
                                        }
                                    >
                                        {saveMutation.isPending ||
                                        updateMutation.isPending ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="mr-1 h-4 w-4" />
                                        )}
                                        {isEditing
                                            ? "Update entry"
                                            : "Save entry"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Camera Capture and Image Crop Dialog */}
                    <Dialog
                        open={isCropDialogOpen}
                        onOpenChange={setIsCropDialogOpen}
                    >
                        <DialogContent className="max-w-md w-full p-6 flex flex-col gap-4">
                            <DialogHeader>
                                <DialogTitle>
                                    {activeCropField === "image"
                                        ? "Upload or Capture Patient Image"
                                        : "Upload or Capture Fingerprint"}
                                </DialogTitle>
                                <DialogDescription>
                                    {!cropImageSrc
                                        ? activeCropField === "image"
                                            ? "Align the camera or upload a file from your device."
                                            : "Upload a clear image of the fingerprint from your device."
                                        : `Pan and zoom the image to crop. Target size: ${activeCropField === "image" ? "300x400 (3:4 aspect ratio)" : "300x300 (1:1 aspect ratio)"}.`}
                                </DialogDescription>
                            </DialogHeader>

                            {!cropImageSrc ? (
                                <div className="flex flex-col gap-4">
                                    {activeCropField === "image" ? (
                                        <>
                                            {/* Camera view */}
                                            <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    muted
                                                    className={cn(
                                                        "w-full h-full object-cover scale-x-[-1]",
                                                        !cameraActive &&
                                                            "hidden",
                                                    )}
                                                />
                                                {!cameraActive && (
                                                    <div className="text-center text-slate-500 p-4">
                                                        <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                                        <p className="text-sm">
                                                            Camera is offline
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        startCamera(
                                                            selectedDeviceId,
                                                        )
                                                    }
                                                    className="flex-1"
                                                >
                                                    <RefreshCw className="h-4 w-4 mr-2" />
                                                    {cameraActive
                                                        ? "Restart Device"
                                                        : "Turn on Device"}
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
                                                    <Label className="text-xs text-muted-foreground">
                                                        Select Camera Device
                                                    </Label>
                                                    <Select
                                                        value={
                                                            selectedDeviceId
                                                        }
                                                        onValueChange={
                                                            handleDeviceChange
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {devices.map(
                                                                (
                                                                    device,
                                                                    idx,
                                                                ) => (
                                                                    <SelectItem
                                                                        key={
                                                                            device.deviceId
                                                                        }
                                                                        value={
                                                                            device.deviceId
                                                                        }
                                                                    >
                                                                        {device.label ||
                                                                            `Device ${idx + 1}`}
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="relative flex py-2 items-center">
                                                <div className="flex-grow border-t border-slate-200"></div>
                                                <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">
                                                    or
                                                </span>
                                                <div className="flex-grow border-t border-slate-200"></div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center gap-2 p-6 border border-dashed rounded-lg bg-slate-50">
                                            <Upload className="h-8 w-8 text-slate-400" />
                                            <p className="text-sm text-slate-600">
                                                Select a fingerprint image
                                                file to upload.
                                            </p>
                                        </div>
                                    )}

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
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            className="w-full flex items-center justify-center gap-2"
                                        >
                                            <Upload className="h-4 w-4" />
                                            {activeCropField === "image"
                                                ? "Select Image File from Device"
                                                : "Select Fingerprint Image from Device"}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {/* Cropping UI */}
                                    <div
                                        className="relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
                                        onPointerDown={(e) => {
                                            e.currentTarget.setPointerCapture(
                                                e.pointerId,
                                            );
                                            setIsDragging(true);
                                            dragStart.current = {
                                                x: e.clientX - pan.x,
                                                y: e.clientY - pan.y,
                                            };
                                        }}
                                        onPointerMove={(e) => {
                                            if (!isDragging) return;
                                            setPan({
                                                x:
                                                    e.clientX -
                                                    dragStart.current.x,
                                                y:
                                                    e.clientY -
                                                    dragStart.current.y,
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
                                                transition: isDragging
                                                    ? "none"
                                                    : "transform 0.1s ease-out",
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
                                                onChange={(e) =>
                                                    setZoom(
                                                        parseFloat(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
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
                                                    onChange={(e) =>
                                                        setRotation(
                                                            parseInt(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setRotation(
                                                            (prev) =>
                                                                (prev + 90) %
                                                                360,
                                                        )
                                                    }
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
                    <Dialog
                        open={isScannerDialogOpen}
                        onOpenChange={setIsScannerDialogOpen}
                    >
                        <DialogContent className="max-w-md w-full p-6 flex flex-col gap-4">
                            <DialogHeader>
                                <DialogTitle>
                                    Fingerprint Scanner Capture
                                </DialogTitle>
                                <DialogDescription>
                                    Interact with your physical fingerprint
                                    scanner device.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-slate-50 min-h-[200px]">
                                {captureJustSucceeded ? (
                                    <div className="flex flex-col items-center gap-3 text-center text-success">
                                        <CheckCircle2 className="h-12 w-12" />
                                        <p className="text-sm font-semibold">
                                            Fingerprint captured successfully!
                                        </p>
                                        {fingerprintQuality !== null && (
                                            <p className="text-xs text-muted-foreground">
                                                Quality score:{" "}
                                                {fingerprintQuality}%
                                            </p>
                                        )}
                                    </div>
                                ) : scannerStatus === "connecting" ||
                                  scannerStatus === "connected" ? (
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                        <p className="text-sm font-semibold">
                                            Getting the scanner ready...
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            No button press needed — the scan
                                            starts automatically once your
                                            finger is detected.
                                        </p>
                                    </div>
                                ) : scannerStatus === "scanning" ? (
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        {scannerLivePreview ? (
                                            <img
                                                src={scannerLivePreview}
                                                alt="Live fingerprint preview"
                                                className="h-28 w-28 object-contain rounded border border-primary/30 bg-white"
                                            />
                                        ) : (
                                            <Fingerprint className="h-14 w-14 text-primary animate-pulse" />
                                        )}
                                        <p className="text-sm font-semibold text-primary">
                                            Please place your finger on the
                                            fingerprint scanner.
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Detecting automatically — hold
                                            still once you feel contact.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-center w-full">
                                        <AlertCircle className="h-12 w-12 text-destructive" />
                                        <p className="text-sm font-semibold text-destructive">
                                            {scannerStatus === "disconnected"
                                                ? "Scanner Not Detected"
                                                : "Capture Failed"}
                                        </p>
                                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md w-full max-h-[100px] overflow-y-auto">
                                            {scannerErrorMsg ||
                                                "Fingerprint scanner not detected. Please connect the scanner and ensure the bridge is running."}
                                        </div>
                                        <div className="mt-1 flex flex-col items-center gap-2 border border-dashed rounded-md p-3 bg-slate-50 w-full">
                                            <p className="text-[11px] text-muted-foreground font-medium">
                                                To run the scanner on this PC,
                                                download and run the bridge
                                                utility:
                                            </p>
                                            <a
                                                href="/drivers/ZK4500_Web_Bridge.exe"
                                                download
                                                className="inline-flex items-center justify-center rounded-md text-xs font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 py-1.5 shadow"
                                            >
                                                Download Scanner Bridge (EXE)
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={
                                                    retryScannerConnection
                                                }
                                                className="text-xs flex items-center gap-1.5"
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                                Retry Scan / Connection
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsScannerDialogOpen(
                                                        false,
                                                    );
                                                    setActiveCropField(
                                                        "fingerprint",
                                                    );
                                                    setIsCropDialogOpen(true);
                                                }}
                                                className="text-xs flex items-center gap-1.5"
                                            >
                                                <Upload className="h-3 w-3" />
                                                Upload Image Instead
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        setIsScannerDialogOpen(false)
                                    }
                                >
                                    Cancel
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* TAB 6: Invoice receipt template */}
                    {activeTab === "Invoice" && (
                        <div className="p-4 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-3 font-sans">
                            {activePatient ? (
                                <>
                                    <div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <img
                                                    src={
                                                        user?.logo_path ||
                                                        "/assets/images/best-logo.png"
                                                    }
                                                    alt="Logo"
                                                    className="h-10 object-contain"
                                                />
                                                <div className="flex flex-col leading-tight">
                                                    <span className="font-bold text-lg text-red-600 whitespace-nowrap">
                                                        {user?.company_name_en ||
                                                            "Best Health Diagnostic & Medical Center"}
                                                    </span>
                                                    {user?.company_name_bn && (
                                                        <span className="font-bold text-sm text-[#19A54B] whitespace-nowrap">
                                                            {
                                                                user.company_name_bn
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {user?.company_address_en ||
                                                    "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}
                                            </p>
                                        </div>
                                        <div className="text-right text-sm flex flex-col items-end gap-0.5 shrink-0">
                                            <h3 className="font-bold text-sm">
                                                PAYMENT RECEIPT
                                            </h3>
                                            <p className="font-mono text-xs text-slate-500 mb-1">
                                                Invoice Date:{" "}
                                                {activePatient.date}
                                            </p>
                                            <BarcodePreview
                                                value={activePatient.pax_id}
                                                displayValue={true}
                                                height={20}
                                            />
                                        </div>
                                        <div className="w-12 h-14 border border-slate-200 rounded overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                                            {activePatient.image_url ? (
                                                <img
                                                    src={
                                                        activePatient.image_url
                                                    }
                                                    alt="Photo"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-[8px] text-slate-400">
                                                    NO PHOTO
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                                        <div className="space-y-1">
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    SL No.:
                                                </span>{" "}
                                                <span className="font-mono font-bold">
                                                    {activePatient.pax_id}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Name:
                                                </span>{" "}
                                                <span className="font-semibold uppercase">
                                                    {activePatient.first_name}{" "}
                                                    {activePatient.last_name ||
                                                        ""}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Father's Name:
                                                </span>{" "}
                                                <span className="font-semibold">
                                                    {activePatient.father_name ||
                                                        "N/A"}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Passport No:
                                                </span>{" "}
                                                <span className="font-semibold">
                                                    {activePatient.passport_no ||
                                                        "N/A"}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Date of Birth:
                                                </span>{" "}
                                                <span className="font-semibold">
                                                    {activePatient.dob
                                                        ? activePatient.dob
                                                              .split("-")
                                                              .reverse()
                                                              .join("/")
                                                        : "N/A"}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Country:
                                                </span>{" "}
                                                <span className="font-semibold uppercase">
                                                    {activePatient.country
                                                        ?.name || "N/A"}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Name of Agency:
                                                </span>{" "}
                                                <span className="font-semibold">
                                                    {activePatient.agency
                                                        ?.name || "N/A"}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Profession:
                                                </span>{" "}
                                                <span className="font-semibold">
                                                    {activePatient.job_applied ||
                                                        "N/A"}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="border-l border-dashed border-slate-200 pl-4 space-y-1.5 font-medium">
                                            <div className="flex justify-between items-center text-xs text-slate-500 pb-1 border-b border-dashed border-slate-100">
                                                <span>Reporting Date:</span>
                                                <span>
                                                    {activePatient.date
                                                        ? activePatient.date
                                                              .split("-")
                                                              .reverse()
                                                              .join("/")
                                                        : ""}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold text-xs">
                                                    BLOOD:
                                                </span>
                                                <span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold text-xs">
                                                    URINE:
                                                </span>
                                                <span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold text-xs">
                                                    STOOL:
                                                </span>
                                                <span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold text-xs">
                                                    PHYSICAL:
                                                </span>
                                                <span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold text-xs">
                                                    X-RAY:
                                                </span>
                                                <span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-left">
                                                <tr>
                                                    <th className="px-4 py-2 font-semibold">
                                                        Description
                                                    </th>
                                                    <th className="px-4 py-2 text-right font-semibold">
                                                        Amount (৳)
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                <tr>
                                                    <td className="px-4 py-2">
                                                        Medical Check-up
                                                        Registration & Report
                                                        fee
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {(
                                                            Number(
                                                                activePatient.medical_fee,
                                                            ) || 0
                                                        ).toLocaleString()}
                                                    </td>
                                                </tr>
                                                {Number(
                                                    activePatient.niddle_charge,
                                                ) > 0 && (
                                                    <tr>
                                                        <td className="px-4 py-2">
                                                            Needle Charge
                                                        </td>
                                                        <td className="px-4 py-2 text-right">
                                                            {(
                                                                Number(
                                                                    activePatient.niddle_charge,
                                                                ) || 0
                                                            ).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr className="font-semibold bg-slate-50 border-t border-slate-200">
                                                    <td className="px-4 py-2">
                                                        Total Amount Due
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {(
                                                            Number(
                                                                activePatient.medical_fee,
                                                            ) +
                                                            (Number(
                                                                activePatient.niddle_charge,
                                                            ) || 0)
                                                        ).toLocaleString()}
                                                    </td>
                                                </tr>
                                                <tr className="font-semibold text-success">
                                                    <td className="px-4 py-2">
                                                        Amount Paid
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {(
                                                            Number(
                                                                activePatient.received_amount,
                                                            ) || 0
                                                        ).toLocaleString()}
                                                    </td>
                                                </tr>
                                                <tr className="font-semibold text-destructive">
                                                    <td className="px-4 py-2">
                                                        Dues Outstanding
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {(
                                                            Number(
                                                                activePatient.due_amount,
                                                            ) || 0
                                                        ).toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="text-sm space-y-2">
                                        <p className="italic">
                                            <span className="text-slate-500 not-italic">
                                                In Words:
                                            </span>{" "}
                                            {activePatient.in_words ||
                                                numberToWords(
                                                    Number(
                                                        activePatient.medical_fee,
                                                    ),
                                                )}
                                        </p>
                                        {activePatient.medical_report
                                            ?.comments && (
                                            <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-mono">
                                                <strong className="text-slate-500 not-italic">
                                                    Comments:
                                                </strong>{" "}
                                                {
                                                    activePatient.medical_report
                                                        .comments
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-end pt-3 text-sm">
                                        <div className="text-center w-48 border-t border-slate-300 pt-2 text-xs text-slate-500 flex flex-col items-center">
                                            {user?.signature_authorised_path && (
                                                <img
                                                    src={
                                                        user.signature_authorised_path
                                                    }
                                                    className="h-12 w-auto object-contain mb-1"
                                                    alt="Authorised Signature"
                                                />
                                            )}
                                            <span>Operator / Cashier</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted-foreground text-center py-12">
                                    Please load or register a patient first.
                                </p>
                            )}
                        </div>
                    )}

                    {/* TAB 6.5: Invoice Zero receipt template */}
                    {activeTab === "Invoice Zero" && (
                        <div className="p-4 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-3 font-sans">
                            {activePatient ? (
                                <>
                                    <div className="flex justify-between items-start border-b border-slate-200 pb-4 gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <img
                                                    src={
                                                        user?.logo_path ||
                                                        "/assets/images/best-logo.png"
                                                    }
                                                    alt="Logo"
                                                    className="h-10 object-contain"
                                                />
                                                <div className="flex flex-col leading-tight">
                                                    <span className="font-bold text-lg text-red-600 whitespace-nowrap">
                                                        {user?.company_name_en ||
                                                            "Best Health Diagnostic & Medical Center"}
                                                    </span>
                                                    {user?.company_name_bn && (
                                                        <span className="font-bold text-sm text-[#19A54B] whitespace-nowrap">
                                                            {
                                                                user.company_name_bn
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {user?.company_address_en ||
                                                    "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}
                                            </p>
                                        </div>
                                        <div className="text-right text-sm flex flex-col items-end gap-0.5 shrink-0">
                                            <h3 className="font-bold text-sm">
                                                PAYMENT RECEIPT
                                            </h3>
                                            <p className="font-mono text-xs text-slate-500 mb-1">
                                                Invoice Date:{" "}
                                                {activePatient.date}
                                            </p>
                                            <BarcodePreview
                                                value={activePatient.pax_id}
                                                displayValue={true}
                                                height={20}
                                            />
                                        </div>
                                        <div className="w-12 h-14 border border-slate-200 rounded overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                                            {activePatient.image_url ? (
                                                <img
                                                    src={
                                                        activePatient.image_url
                                                    }
                                                    alt="Photo"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-[8px] text-slate-400">
                                                    NO PHOTO
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                                        <div className="space-y-1">
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    SL No.:
                                                </span>{" "}
                                                <span className="font-mono font-bold">
                                                    {activePatient.pax_id}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Name:
                                                </span>{" "}
                                                <span className="font-semibold uppercase">
                                                    {activePatient.first_name}{" "}
                                                    {activePatient.last_name ||
                                                        ""}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Father's Name:
                                                </span>{" "}
                                                <span className="font-semibold">
                                                    {activePatient.father_name ||
                                                        "N/A"}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Passport No:
                                                </span>{" "}
                                                <span className="font-semibold">
                                                    {activePatient.passport_no ||
                                                        "N/A"}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Date of Birth:
                                                </span>{" "}
                                                <span className="font-semibold">
                                                    {activePatient.dob
                                                        ? activePatient.dob
                                                              .split("-")
                                                              .reverse()
                                                              .join("/")
                                                        : "N/A"}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Country:
                                                </span>{" "}
                                                <span className="font-semibold uppercase">
                                                    {activePatient.country
                                                        ?.name || "N/A"}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Name of Agency:
                                                </span>{" "}
                                                <span className="font-semibold">
                                                    {activePatient.agency
                                                        ?.name || "N/A"}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-slate-500 font-medium">
                                                    Profession:
                                                </span>{" "}
                                                <span className="font-semibold">
                                                    {activePatient.job_applied ||
                                                        "N/A"}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="border-l border-dashed border-slate-200 pl-4 space-y-1.5 font-medium">
                                            <div className="flex justify-between items-center text-xs text-slate-500 pb-1 border-b border-dashed border-slate-100">
                                                <span>Reporting Date:</span>
                                                <span>
                                                    {activePatient.date
                                                        ? activePatient.date
                                                              .split("-")
                                                              .reverse()
                                                              .join("/")
                                                        : ""}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold text-xs">
                                                    BLOOD:
                                                </span>
                                                <span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold text-xs">
                                                    URINE:
                                                </span>
                                                <span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold text-xs">
                                                    STOOL:
                                                </span>
                                                <span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold text-xs">
                                                    PHYSICAL:
                                                </span>
                                                <span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-semibold text-xs">
                                                    X-RAY:
                                                </span>
                                                <span className="w-3.5 h-3.5 border border-slate-300 rounded inline-block bg-slate-50"></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-left">
                                                <tr>
                                                    <th className="px-4 py-2 font-semibold">
                                                        Description
                                                    </th>
                                                    <th className="px-4 py-2 text-right font-semibold">
                                                        Amount (৳)
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                <tr>
                                                    <td className="px-4 py-2">
                                                        Medical Check-up
                                                        Registration & Report
                                                        fee
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        0
                                                    </td>
                                                </tr>
                                                <tr className="font-semibold bg-slate-50 border-t border-slate-200">
                                                    <td className="px-4 py-2">
                                                        Total Amount Due
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        0
                                                    </td>
                                                </tr>
                                                <tr className="font-semibold text-success">
                                                    <td className="px-4 py-2">
                                                        Amount Paid
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        0
                                                    </td>
                                                </tr>
                                                <tr className="font-semibold text-slate-500">
                                                    <td className="px-4 py-2">
                                                        Dues Outstanding
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        0
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="text-sm space-y-2">
                                        <p className="italic">
                                            <span className="text-slate-500 not-italic">
                                                In Words:
                                            </span>{" "}
                                            Zero Taka Only
                                        </p>
                                        {activePatient.medical_report
                                            ?.comments && (
                                            <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-mono">
                                                <strong className="text-slate-500 not-italic">
                                                    Comments:
                                                </strong>{" "}
                                                {
                                                    activePatient.medical_report
                                                        .comments
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-end pt-3 text-sm">
                                        <div className="text-center w-48 border-t border-slate-300 pt-2 text-xs text-slate-500 flex flex-col items-center">
                                            {user?.signature_authorised_path && (
                                                <img
                                                    src={
                                                        user.signature_authorised_path
                                                    }
                                                    className="h-12 w-auto object-contain mb-1"
                                                    alt="Authorised Signature"
                                                />
                                            )}
                                            <span>Operator / Cashier</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted-foreground text-center py-12">
                                    Please load or register a patient first.
                                </p>
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
                                                    {activePatient.first_name}{" "}
                                                    {activePatient.last_name ||
                                                        ""}
                                                </div>
                                                <div className="text-center text-[10px] text-slate-500">
                                                    Date: {activePatient.date}
                                                </div>
                                                <div className="mt-1 flex justify-center">
                                                    <BarcodePreview
                                                        value={
                                                            activePatient.pax_id
                                                        }
                                                        displayValue={true}
                                                        height={38}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted-foreground text-center py-12">
                                    Please load or register a patient first to
                                    print labels.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardShell>
    );
}
