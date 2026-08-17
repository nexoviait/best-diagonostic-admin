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
import { Combobox } from "@/components/ui/combobox";
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
    Plus,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { toastApiError } from "@/lib/toast-error";
import { FieldError } from "@/components/ui/field-error";
import { validateImageFile } from "@/lib/validate-image";
import { savePatientPhotoToFolder } from "@/lib/patientPhotoFolder";
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
import { Checkbox } from "@/components/ui/checkbox";

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
    fontSize = 10,
    bold = false,
}: {
    value: string;
    displayValue?: boolean;
    height?: number;
    fontSize?: number;
    bold?: boolean;
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
                    fontSize: fontSize,
                    fontOptions: bold ? "bold" : "",
                    margin: 0,
                });
            } catch (e) {
                console.error(e);
            }
        }
    }, [value, displayValue, height, fontSize, bold]);

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
        <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-start gap-1.5 sm:gap-3 min-w-0 w-full">
            <Label className="text-sm font-medium text-primary/80 sm:pt-2 border-3 border-white/25 rounded-md px-2 py-1 w-full block">
                {label}
            </Label>
            <div className="min-w-0 w-full">
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

function canvasToBlobAsync(
    canvas: HTMLCanvasElement,
    quality: number,
): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
    });
}

// Patient photos and fingerprint images only need to be legible at the tiny
// sizes they're actually shown at (cards, thumbnails, printed reports) — not
// full-resolution camera/gallery quality. Re-encodes at progressively lower
// JPEG quality until the file is under targetKB, so a multi-MB phone photo
// doesn't get stored (and uploaded) at its original size for no benefit.
// Falls back to the smallest size it managed if even the lowest quality
// tried is still over target, rather than degrading indefinitely.
async function compressCanvasToTargetSize(
    canvas: HTMLCanvasElement,
    targetKB: number,
): Promise<Blob | null> {
    const qualities = [0.85, 0.7, 0.55, 0.4, 0.3, 0.2];
    let smallestBlob: Blob | null = null;
    for (const quality of qualities) {
        const blob = await canvasToBlobAsync(canvas, quality);
        if (!blob) continue;
        if (!smallestBlob || blob.size < smallestBlob.size) {
            smallestBlob = blob;
        }
        if (blob.size <= targetKB * 1024) {
            return blob;
        }
    }
    return smallestBlob;
}

// Reporting date is the next day after entry, skipping Friday (office day off) —
// an entry made on Thursday reports on Saturday instead of Friday.
function computeReportingDate(entryDate: string): string {
    if (!entryDate) return "";
    const d = new Date(entryDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 5) {
        d.setDate(d.getDate() + 1);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function EntryFormPage() {
    const queryClient = useQueryClient();
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
    // Agencies created inline via the quick-add dialog below. One-time
    // agencies are excluded from the main `agencies` list by the backend
    // (so they don't clutter the picker for future patients), so we keep
    // whatever was just created in this session here too, purely so the
    // Combobox can still display/select it for the entry currently being
    // filled out.
    const [extraAgencyOptions, setExtraAgencyOptions] = useState<
        { value: string; label: string }[]
    >([]);
    const [isAddAgencyOpen, setIsAddAgencyOpen] = useState(false);
    const [newAgencyName, setNewAgencyName] = useState("");
    const [newAgencyOneTime, setNewAgencyOneTime] = useState(true);
    const [addAgencyLoading, setAddAgencyLoading] = useState(false);
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
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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

    const handleSaveCrop = async () => {
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

        const blob = await compressCanvasToTargetSize(canvas, 40);
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
                savePhotoToDownloads(blob);
            } else {
                handleFingerprintFileChange(file);
                setFingerprintPreviewUrl(previewUrl);
            }
            setIsCropDialogOpen(false);
            toast.success(
                `${activeCropField === "image" ? "Image" : "Fingerprint"} cropped and set successfully.`,
            );
        }
    };

    // Also saves a copy of the cropped patient photo into a "PatientPhotos"
    // folder on the operator's PC, purely as a local backup. Does not touch
    // the existing upload-to-server flow above.
    const savePhotoToDownloads = (blob: Blob) => {
        const safeName =
            `${firstName}_${lastName}`.trim().replace(/[^a-zA-Z0-9_-]+/g, "_") ||
            "patient";
        const filename = `${safeName}_${Date.now()}.jpg`;

        savePatientPhotoToFolder(blob, filename)
            .then((result) => {
                if (result.ok) return;

                // Browser doesn't support the File System Access API,
                // the page isn't on a secure origin, or the user declined
                // folder access — fall back to a plain download (lands in
                // the Downloads root) and tell the operator why.
                if (result.reason === "unsupported") {
                    toast.info(
                        "This browser can't save directly into a folder — saved to Downloads instead. Use Chrome or Edge for direct folder saving.",
                    );
                } else if (result.reason === "insecure-context") {
                    toast.info(
                        "Direct folder saving needs a secure (https) or localhost address — saved to Downloads instead.",
                    );
                } else if (result.reason === "denied") {
                    toast.info(
                        "Folder access wasn't granted — saved to Downloads instead.",
                    );
                } else {
                    console.error(
                        "Direct folder save failed:",
                        result.detail,
                    );
                    toast.info(
                        `Couldn't save into the folder (${result.detail || "unknown error"}) — saved to Downloads instead.`,
                    );
                }

                try {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (err) {
                    console.error("Failed to save photo copy locally:", err);
                }
            })
            .catch((err) => {
                console.error("Failed to save photo copy locally:", err);
            });
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
    const SCANNER_RECONNECT_MIN_MS = 3000;
    const SCANNER_RECONNECT_MAX_MS = 30000;
    const scannerReconnectDelayRef = useRef(SCANNER_RECONNECT_MIN_MS);

    const scheduleScannerReconnect = () => {
        if (scannerReconnectTimer.current) return;
        const delay = scannerReconnectDelayRef.current;
        scannerReconnectDelayRef.current = Math.min(
            delay * 2,
            SCANNER_RECONNECT_MAX_MS,
        );
        scannerReconnectTimer.current = setTimeout(() => {
            scannerReconnectTimer.current = null;
            connectScannerWs();
        }, delay);
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
            scannerReconnectDelayRef.current = SCANNER_RECONNECT_MIN_MS;
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

    // Fetch all patients for Next/Previous navigation, same as Report Entry.
    const { data: allPatients = [] } = useQuery<any[]>({
        queryKey: ["patients-list-all"],
        queryFn: () => apiRequest("/patients"),
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
            const selected = [...agencies, ...extraAgencyOptions.map((o) => ({ id: o.value, name: o.label, price: null }))]
                .find((a) => String(a.id) === newAgencyId);
            if (selected && (selected as any).price) {
                setMedicalFee(Number((selected as any).price));
            }
        }
    };

    // Lets staff register a walk-in/one-time agency without leaving the
    // Entry Form. Defaults to "one-time" so it won't clutter the agency
    // picker for future patients, but that can be unchecked for a real new
    // permanent partner.
    const handleQuickAddAgency = async () => {
        if (!newAgencyName.trim()) {
            toast.error("Please enter an agency name.");
            return;
        }
        setAddAgencyLoading(true);
        try {
            const result = await apiRequest("/agencies", {
                method: "POST",
                body: JSON.stringify({
                    name: newAgencyName.trim(),
                    is_one_time: newAgencyOneTime,
                }),
            });
            const created = result?.data || result;
            setExtraAgencyOptions((prev) => [
                ...prev,
                { value: String(created.id), label: created.name },
            ]);
            handleAgencyChange(String(created.id));
            queryClient.invalidateQueries({ queryKey: ["agencies"] });
            toast.success(
                newAgencyOneTime
                    ? "One-time agency added and selected."
                    : "Agency added and selected.",
            );
            setIsAddAgencyOpen(false);
            setNewAgencyName("");
            setNewAgencyOneTime(true);
        } catch (err: any) {
            toastApiError(err, "Failed to add agency.");
        } finally {
            setAddAgencyLoading(false);
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

    // NEXT / PREVIOUS Navigation — sorted ascending by ID so "NEXT" always
    // moves to the next-higher (newer) patient ID and "PREVIOUS" moves to
    // the next-lower (older) one, matching what the button labels say
    // (same convention as the Report Entry sidebar).
    const handleNextPatient = () => {
        if (!activePatient || !allPatients.length) return;
        const sorted = [...allPatients].sort((a, b) => a.id - b.id);
        const currentIndex = sorted.findIndex((p) => p.id === activePatient.id);
        if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
            const nextPatient = sorted[currentIndex + 1];
            setActivePatient(nextPatient);
            setSearchPaxId(nextPatient.pax_id);
            populateForm(nextPatient);
        } else {
            toast.info("Reached end of patient list.");
        }
    };

    const handlePreviousPatient = () => {
        if (!activePatient || !allPatients.length) return;
        const sorted = [...allPatients].sort((a, b) => a.id - b.id);
        const currentIndex = sorted.findIndex((p) => p.id === activePatient.id);
        if (currentIndex > 0) {
            const prevPatient = sorted[currentIndex - 1];
            setActivePatient(prevPatient);
            setSearchPaxId(prevPatient.pax_id);
            populateForm(prevPatient);
        } else {
            toast.info("Reached beginning of patient list.");
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

        const authSigUrl =
            user?.signature_authorised_path ||
            user?.signature_path ||
            siteSettings?.signature_authorised_path;

        let html = "";

        if (activeTab === "Invoice") {
            html = `
        <html>
        <head>
          <title>Invoice - ${activePatient.pax_id}</title>
          <style>
            @page { size: A4; margin: 8mm 12mm; }
            .half-page { height: 140mm; padding-top: 6px; box-sizing: border-box; overflow: hidden; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            html, body { width: 100%; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #000; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; gap: 12px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: bold; color: oklch(0.58 0.14 180); }
            .header p { margin: 4px 0 0; font-size: 13px; color: #000; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; }
            .report-title-section h3 { margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; color: #000; }
            .report-title-section p { margin: 3px 0 0; font-size: 13px; font-family: monospace; color: #000; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 4px; }
            .meta-column p { margin: 1px 0; }
            .label { color: #000; }
            .value { font-weight: 600; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 14px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th, td { padding: 3px 10px; }
            th { background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0; color: #000; text-align: left; }
            td { border-bottom: 1px solid #f1f5f9; text-align: left; }
            .text-right { text-align: right; }
            tr:last-child td { border-bottom: none; }
            .total-row { font-weight: 600; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
            .success-row { font-weight: 600; color: rgb(22, 163, 74); }
            .destructive-row { font-weight: 600; color: rgb(220, 38, 38); }
            .in-words-section { font-size: 14px; margin-top: 4px; font-style: italic; }
            .in-words-section span { font-style: normal; color: #000; }
            .footer-section { display: flex; justify-content: space-between; align-items: end; margin-top: 4px; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 180px; padding-top: 2px; font-size: 13px; color: #000; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="initBarcode()">
          <div class="half-page">
          <div class="header">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 56px; object-fit: contain;" />
                <div style="display: flex; flex-direction: column; line-height: 1.15;">
                  <span style="font-weight: bold; font-size: 18px; color: #dc2626; white-space: nowrap;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                  ${user?.company_name_bn ? `<span style="font-weight: bold; font-size: 13px; color: #19A54B; white-space: nowrap;">${user.company_name_bn}</span>` : ""}
                </div>
              </div>
              <p>${user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
            </div>
            <div class="report-title-section" style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0;">
              <h3>PAYMENT RECEIPT</h3>
              <p style="margin-bottom: 3px; margin-top: 3px; font-size: 11px; color: #000;">Invoice Date: ${activePatient.date}</p>
              <svg id="invoice-barcode"></svg>
            </div>
            <img src="${activePatient.image_url || "/assets/images/best-logo.png"}" onerror="this.src='/assets/images/best-logo.png'" style="width: 64px; height: 80px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; flex-shrink: 0;" />
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
              <p><span class="label" style="display: inline-block; width: 130px;">Reporting Date</span> <span class="value">: ${activePatient.date ? computeReportingDate(activePatient.date).split("-").reverse().join("/") : ""}</span></p>
              <div style="display: flex; justify-content: flex-start; align-items: center; margin-top: 6px;"><span class="label" style="font-weight: 600; color: #000; display: inline-block; width: 70px;">BLOOD:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block;"></span></div>
              <div style="display: flex; justify-content: flex-start; align-items: center;"><span class="label" style="font-weight: 600; color: #000; display: inline-block; width: 70px;">URINE:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block;"></span></div>
              <div style="display: flex; justify-content: flex-start; align-items: center;"><span class="label" style="font-weight: 600; color: #000; display: inline-block; width: 70px;">STOOL:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block;"></span></div>
              <div style="display: flex; justify-content: flex-start; align-items: center;"><span class="label" style="font-weight: 600; color: #000; display: inline-block; width: 70px;">PHYSICAL:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block;"></span></div>
              <div style="display: flex; justify-content: flex-start; align-items: center;"><span class="label" style="font-weight: 600; color: #000; display: inline-block; width: 70px;">X-RAY:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block;"></span></div>
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
              ${Number(activePatient.niddle_charge) > 0
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
          </div>
          <div class="footer-section">
            <div>
              <div style="font-size: 16px; color: #000000;">https://bestdiagnostic.com.bd/</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Developed by Nexovia IT Limited</div>
            </div>
            ${authSigUrl
                    ? `<div class="signature" style="border-top: none; margin-left: auto;"><img src="${authSigUrl}" style="height: 36px; object-fit: contain; display: block; margin: 0 auto 2px auto;" />Operator / Cashier</div>`
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
          </div>
        </body>
        </html>
      `;
        } else if (activeTab === "Invoice Zero") {
            html = `
        <html>
        <head>
          <title>Invoice Zero - ${activePatient.pax_id}</title>
          <style>
            @page { size: A4; margin: 8mm 12mm; }
            .half-page { height: 140mm; padding-top: 6px; box-sizing: border-box; overflow: hidden; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            html, body { width: 100%; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #000; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; gap: 12px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: bold; color: oklch(0.58 0.14 180); }
            .header p { margin: 4px 0 0; font-size: 13px; color: #000; }
            .report-title-section { text-align: right; display: flex; flex-direction: column; align-items: end; }
            .report-title-section h3 { margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 0.05em; color: #000; }
            .report-title-section p { margin: 3px 0 0; font-size: 13px; font-family: monospace; color: #000; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 4px; }
            .meta-column p { margin: 1px 0; }
            .label { color: #000; }
            .value { font-weight: 600; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 14px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            th, td { padding: 3px 10px; }
            th { background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0; color: #000; text-align: left; }
            td { border-bottom: 1px solid #f1f5f9; text-align: left; }
            .text-right { text-align: right; }
            tr:last-child td { border-bottom: none; }
            .total-row { font-weight: 600; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
            .success-row { font-weight: 600; color: rgb(22, 163, 74); }
            .normal-row { font-weight: 600; color: #64748b; }
            .in-words-section { font-size: 14px; margin-top: 4px; font-style: italic; }
            .in-words-section span { font-style: normal; color: #000; }
            .footer-section { display: flex; justify-content: space-between; align-items: end; margin-top: 4px; }
            .signature { text-align: center; border-top: 1px solid #cbd5e1; width: 180px; padding-top: 2px; font-size: 13px; color: #000; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body onload="initBarcode()">
          <div class="half-page">
          <div class="header">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <img src="${user?.logo_path || "/assets/images/best-logo.png"}" style="height: 56px; object-fit: contain;" />
                <div style="display: flex; flex-direction: column; line-height: 1.15;">
                  <span style="font-weight: bold; font-size: 18px; color: #dc2626; white-space: nowrap;">${user?.company_name_en || "Best Health Diagnostic & Medical Center"}</span>
                  ${user?.company_name_bn ? `<span style="font-weight: bold; font-size: 13px; color: #19A54B; white-space: nowrap;">${user.company_name_bn}</span>` : ""}
                </div>
              </div>
              <p>${user?.company_address_en || "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}</p>
            </div>
            <div class="report-title-section" style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0;">
              <h3>PAYMENT RECEIPT</h3>
              <p style="margin-bottom: 3px; margin-top: 3px; font-size: 11px; color: #000;">Invoice Date: ${activePatient.date}</p>
              <svg id="invoice-barcode"></svg>
            </div>
            <img src="${activePatient.image_url || "/assets/images/best-logo.png"}" onerror="this.src='/assets/images/best-logo.png'" style="width: 64px; height: 80px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; flex-shrink: 0;" />
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
              <p><span class="label" style="display: inline-block; width: 130px;">Reporting Date</span> <span class="value">: ${activePatient.date ? computeReportingDate(activePatient.date).split("-").reverse().join("/") : ""}</span></p>
              <div style="display: flex; justify-content: flex-start; align-items: center; margin-top: 6px;"><span class="label" style="font-weight: 600; color: #000; display: inline-block; width: 70px;">BLOOD:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block;"></span></div>
              <div style="display: flex; justify-content: flex-start; align-items: center;"><span class="label" style="font-weight: 600; color: #000; display: inline-block; width: 70px;">URINE:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block;"></span></div>
              <div style="display: flex; justify-content: flex-start; align-items: center;"><span class="label" style="font-weight: 600; color: #000; display: inline-block; width: 70px;">STOOL:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block;"></span></div>
              <div style="display: flex; justify-content: flex-start; align-items: center;"><span class="label" style="font-weight: 600; color: #000; display: inline-block; width: 70px;">PHYSICAL:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block;"></span></div>
              <div style="display: flex; justify-content: flex-start; align-items: center;"><span class="label" style="font-weight: 600; color: #000; display: inline-block; width: 70px;">X-RAY:</span><span style="width: 10px; height: 10px; border: 1px solid #000; display: inline-block;"></span></div>
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
          </div>
          <div class="footer-section">
            <div>
              <div style="font-size: 16px; color: #000;">https://bestdiagnostic.com.bd/</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Developed by Nexovia IT Limited</div>
            </div>
            ${authSigUrl
                    ? `<div class="signature" style="border-top: none; margin-left: auto;"><img src="${authSigUrl}" style="height: 36px; object-fit: contain; display: block; margin: 0 auto 2px auto;" />Operator / Cashier</div>`
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
          </div>
        </body>
        </html>
      `;
        } else if (activeTab === "Label Print") {
            const paxId = activePatient.pax_id;
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
          .smart-date { font-size: 9px; font-weight: normal; margin-bottom: 4px; text-align: center; color: #000;}

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
                  width: 1.0,
                  height: 46,
                  displayValue: true,
                  fontSize: 16,
                  fontOptions: 'bold',
                  textMargin: 4,
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

    // Ctrl+P (Cmd+P on Mac) used to fall through to the browser's native
    // print, which prints the on-screen React tab as-is — a different
    // rendering from the dedicated print popup above (different markup,
    // different CSS), so the two could never be made pixel-identical and
    // would keep drifting apart on every future style tweak. Intercepting
    // the shortcut and routing it through the exact same handlePrint()
    // guarantees there's only one code path producing printed output, ever.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isPrintShortcut =
                (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p";
            if (isPrintShortcut) {
                e.preventDefault();
                handlePrint();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    return (
        <DashboardShell
            title="Entry Form"
            subtitle="Register patient entries and preview documents."
        >
            {/* Top search bar to load existing records */}
            <div className="no-print card-surface p-3 sm:p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Active Patient:
                    </Label>
                    <span className="font-semibold text-primary font-mono text-xs sm:text-sm">
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
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
                        className="w-full sm:w-56 h-8 text-xs"
                        value={searchPaxId}
                        onChange={(e) => setSearchPaxId(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button
                        size="sm"
                        onClick={handleSearch}
                        disabled={searchLoading}
                        className="w-full sm:w-auto"
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

            <div className="entry-form-main-grid grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[220px_1fr]">
                {/* Sidebar Actions */}
                <aside className="no-print card-surface min-w-0 p-3 h-fit space-y-3">
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
                    {activePatient && canPrintCard && (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                className="gradient-primary shadow-md w-full sm:w-auto"
                                onClick={handlePrint}
                                disabled={!activePatient}
                            >
                                <Printer className="mr-2 h-4 w-4" /> Print
                                Document
                            </Button>
                        </div>
                    )}
                    <div className="border-t border-border/40 pt-2 space-y-1">
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                            disabled={!activePatient}
                            onClick={handleNextPatient}
                        >
                            NEXT →
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full justify-start"
                            disabled={!activePatient}
                            onClick={handlePreviousPatient}
                        >
                            ← PREVIOUS
                        </Button>
                    </div>
                </aside>

                {/* Content Panel */}
                <div className="entry-form-content-panel card-surface min-w-0 p-4 sm:p-6 overflow-hidden">
                    {/* TAB 1: New Entry registration form */}
                    {activeTab === "New Entry" && (
                        <div>
                            <div className="mb-4 flex items-center gap-3 border-b border-primary/15 pb-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                    <FileText className="h-4.5 w-4.5" />
                                </div>
                                <h3 className="font-display text-base font-semibold">
                                    Patient Medical Registration
                                </h3>
                            </div>
                            <div className="dark-fields-panel grid gap-x-8 gap-y-3 sm:gap-y-4 grid-cols-1 xl:grid-cols-2 min-w-0 rounded-xl border border-black/20 bg-[#5c5c5c] p-4 sm:p-6">
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
                                    <Combobox
                                        value={countryId}
                                        onChange={(val) => {
                                            setCountryId(val);
                                            clear("country_id");
                                        }}
                                        options={countries.map((c) => ({
                                            value: String(c.id),
                                            label: c.name,
                                        }))}
                                        placeholder="Select country"
                                        searchPlaceholder="Type to search country..."
                                        emptyText="No country found."
                                        className={cn(
                                            fieldErrors.country_id &&
                                            "border-red-500 ring-red-500",
                                        )}
                                    />
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
                                    <div className="flex items-center gap-1.5">
                                        <div className="min-w-0 flex-1">
                                            <Combobox
                                                value={agencyId}
                                                onChange={(val) => {
                                                    handleAgencyChange(val);
                                                    clear("agency_id");
                                                }}
                                                options={[
                                                    ...agencies.map((a) => ({
                                                        value: String(a.id),
                                                        label: a.name,
                                                    })),
                                                    ...extraAgencyOptions,
                                                ]}
                                                placeholder="Select agency"
                                                searchPlaceholder="Type to search agency..."
                                                emptyText="No agency found."
                                                className={cn(
                                                    fieldErrors.agency_id &&
                                                    "border-red-500 ring-red-500",
                                                )}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 shrink-0"
                                            title="Add a new agency (e.g. a one-time walk-in)"
                                            onClick={() => setIsAddAgencyOpen(true)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </Field>

                                <Field label="MR" error={fieldErrors.mr_id}>
                                    <Combobox
                                        value={mrId}
                                        onChange={(val) => {
                                            setMrId(val);
                                            clear("mr_id");
                                        }}
                                        options={mrs.map((m) => ({
                                            value: String(m.id),
                                            label: m.name,
                                        }))}
                                        placeholder="Select MR"
                                        searchPlaceholder="Type to search MR..."
                                        emptyText="No MR found."
                                        className={cn(
                                            fieldErrors.mr_id &&
                                            "border-red-500 ring-red-500",
                                        )}
                                    />
                                </Field>

                                <Field
                                    label="Image"
                                    error={imageError || fieldErrors.image}
                                >
                                    <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 min-w-0">
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
                                                "h-9 flex items-center gap-2 max-w-full text-xs sm:text-sm",
                                                (imageError ||
                                                    fieldErrors.image) &&
                                                "border-red-500 text-red-500",
                                            )}
                                            onClick={() => {
                                                setActiveCropField("image");
                                                setIsCropDialogOpen(true);
                                            }}
                                        >
                                            <Camera className="h-4 w-4 shrink-0" />
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
                                    <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 min-w-0">
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
                                        <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    "h-9 flex items-center gap-2 max-w-full text-xs sm:text-sm",
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
                                                <Fingerprint className="h-4 w-4 shrink-0" />
                                                Scan Fingerprint
                                            </Button>
                                            <span className="inline-flex items-center gap-1.5 text-[10px] text-white/70">
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
                                                className="text-sm font-medium text-emerald-300 underline underline-offset-2 hover:text-emerald-200 text-left"
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

                            <div className="mt-8 pt-6">
                                <div className="dark-fields-panel grid gap-x-8 gap-y-3 sm:gap-y-4 grid-cols-1 xl:grid-cols-2 min-w-0 rounded-xl border border-black/20 bg-[#5c5c5c] p-4 sm:p-6">
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
                                                        "w-full h-full object-cover",
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

                    {/* Quick-add Agency Dialog — mainly for one-time/walk-in agencies */}
                    <Dialog open={isAddAgencyOpen} onOpenChange={setIsAddAgencyOpen}>
                        <DialogContent className="max-w-md w-full p-6 flex flex-col gap-4">
                            <DialogHeader>
                                <DialogTitle>Add New Agency</DialogTitle>
                                <DialogDescription>
                                    Quickly register an agency without leaving this form.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-sm text-muted-foreground">
                                        Agency Name
                                    </Label>
                                    <Input
                                        autoFocus
                                        placeholder="Enter agency name"
                                        value={newAgencyName}
                                        onChange={(e) =>
                                            setNewAgencyName(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleQuickAddAgency();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex items-start gap-2 pt-1">
                                    <Checkbox
                                        id="new-agency-one-time"
                                        checked={newAgencyOneTime}
                                        onCheckedChange={(checked) =>
                                            setNewAgencyOneTime(checked === true)
                                        }
                                    />
                                    <Label
                                        htmlFor="new-agency-one-time"
                                        className="font-normal leading-snug cursor-pointer"
                                    >
                                        One-time / walk-in agency
                                        <span className="block text-xs text-muted-foreground font-normal">
                                            Won't show up in this picker again after today — use this for a one-off referrer. Uncheck if it's a real ongoing partner.
                                        </span>
                                    </Label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsAddAgencyOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    className="gradient-primary"
                                    disabled={addAgencyLoading || !newAgencyName.trim()}
                                    onClick={handleQuickAddAgency}
                                >
                                    {addAgencyLoading ? (
                                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="mr-1 h-4 w-4" />
                                    )}
                                    Add & Select
                                </Button>
                            </div>
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
                        <div className="invoice-print-card p-3 sm:p-4 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-3 font-sans overflow-x-auto min-w-0">
                            {activePatient ? (
                                <>
                                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-200 pb-4 gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <img
                                                    src={
                                                        user?.logo_path ||
                                                        "/assets/images/best-logo.png"
                                                    }
                                                    alt="Logo"
                                                    className="h-9 sm:h-10 object-contain shrink-0"
                                                />
                                                <div className="flex flex-col leading-tight min-w-0">
                                                    <span className="font-bold text-base sm:text-lg text-red-600 break-words">
                                                        {user?.company_name_en ||
                                                            "Best Health Diagnostic & Medical Center"}
                                                    </span>
                                                    {user?.company_name_bn && (
                                                        <span className="font-bold text-xs sm:text-sm text-[#19A54B] break-words">
                                                            {
                                                                user.company_name_bn
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 break-words">
                                                {user?.company_address_en ||
                                                    "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between xl:justify-end gap-3 w-full xl:w-auto shrink-0 border-t xl:border-t-0 pt-2 xl:pt-0 border-slate-100">
                                            <div className="text-left xl:text-right text-sm flex flex-col items-start xl:items-end gap-0.5">
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
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                                        <div className="space-y-1 min-w-0">
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
                                        <div className="border-t sm:border-t-0 sm:border-l border-dashed border-slate-200 pt-3 sm:pt-0 sm:pl-4 space-y-1.5 font-medium min-w-0">
                                            <div className="flex justify-between items-center text-xs text-slate-500 pb-1 border-b border-dashed border-slate-100">
                                                <span>Reporting Date:</span>
                                                <span>
                                                    {activePatient.date
                                                        ? computeReportingDate(
                                                            activePatient.date,
                                                        )
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
                                    </div>

                                    <div className="flex justify-end pt-4 text-sm">
                                        <div className="text-center w-48 text-xs text-slate-600 flex flex-col items-center">
                                            <div className="h-12 flex items-end justify-center mb-1">
                                                {user?.signature_authorised_path ||
                                                user?.signature_path ||
                                                siteSettings?.signature_authorised_path ? (
                                                    <img
                                                        src={
                                                            user?.signature_authorised_path ||
                                                            user?.signature_path ||
                                                            siteSettings?.signature_authorised_path
                                                        }
                                                        className="h-12 w-auto object-contain"
                                                        alt="Authorised Signature"
                                                    />
                                                ) : (
                                                    <div className="h-6" />
                                                )}
                                            </div>
                                            <div className="w-full border-t border-dashed border-slate-400 pt-1 text-center font-semibold text-[11px] uppercase tracking-wider text-slate-700">
                                                Operator / Cashier
                                            </div>
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
                        <div className="invoice-print-card p-3 sm:p-4 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-3 font-sans overflow-x-auto min-w-0">
                            {activePatient ? (
                                <>
                                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-200 pb-4 gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <img
                                                    src={
                                                        user?.logo_path ||
                                                        "/assets/images/best-logo.png"
                                                    }
                                                    alt="Logo"
                                                    className="h-9 sm:h-10 object-contain shrink-0"
                                                />
                                                <div className="flex flex-col leading-tight min-w-0">
                                                    <span className="font-bold text-base sm:text-lg text-red-600 break-words">
                                                        {user?.company_name_en ||
                                                            "Best Health Diagnostic & Medical Center"}
                                                    </span>
                                                    {user?.company_name_bn && (
                                                        <span className="font-bold text-xs sm:text-sm text-[#19A54B] break-words">
                                                            {
                                                                user.company_name_bn
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 break-words">
                                                {user?.company_address_en ||
                                                    "1/A DIT Extension Road, Fakirapool, Dhaka-1000"}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between xl:justify-end gap-3 w-full xl:w-auto shrink-0 border-t xl:border-t-0 pt-2 xl:pt-0 border-slate-100">
                                            <div className="text-left xl:text-right text-sm flex flex-col items-start xl:items-end gap-0.5">
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
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                                        <div className="space-y-1 min-w-0">
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
                                        <div className="border-t sm:border-t-0 sm:border-l border-dashed border-slate-200 pt-3 sm:pt-0 sm:pl-4 space-y-1.5 font-medium min-w-0">
                                            <div className="flex justify-between items-center text-xs text-slate-500 pb-1 border-b border-dashed border-slate-100">
                                                <span>Reporting Date:</span>
                                                <span>
                                                    {activePatient.date
                                                        ? computeReportingDate(
                                                            activePatient.date,
                                                        )
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
                                    </div>

                                    <div className="flex justify-end pt-4 text-sm">
                                        <div className="text-center w-48 text-xs text-slate-600 flex flex-col items-center">
                                            <div className="h-12 flex items-end justify-center mb-1">
                                                {user?.signature_authorised_path ||
                                                user?.signature_path ||
                                                siteSettings?.signature_authorised_path ? (
                                                    <img
                                                        src={
                                                            user?.signature_authorised_path ||
                                                            user?.signature_path ||
                                                            siteSettings?.signature_authorised_path
                                                        }
                                                        className="h-12 w-auto object-contain"
                                                        alt="Authorised Signature"
                                                    />
                                                ) : (
                                                    <div className="h-6" />
                                                )}
                                            </div>
                                            <div className="w-full border-t border-dashed border-slate-400 pt-1 text-center font-semibold text-[11px] uppercase tracking-wider text-slate-700">
                                                Operator / Cashier
                                            </div>
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
                                                <div className="text-center font-normal text-[9px] text-slate-700">
                                                    Date: {activePatient.date}
                                                </div>
                                                <div className="mt-1 flex justify-center">
                                                    <BarcodePreview
                                                        value={
                                                            activePatient.pax_id
                                                        }
                                                        displayValue={true}
                                                        height={46}
                                                        fontSize={16}
                                                        bold={true}
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
