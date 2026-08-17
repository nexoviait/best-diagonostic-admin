// Saves a copy of the cropped patient photo directly into a "PatientPhotos"
// folder chosen by the operator (typically inside Downloads), using the
// File System Access API (Chrome/Edge only, and only on a secure context —
// https:// or http://localhost). The folder handle is persisted in
// IndexedDB so the operator is only asked to pick the parent folder once;
// every later save reuses that folder without prompting again.
const DB_NAME = "patient-photo-folder";
const STORE_NAME = "handles";
const HANDLE_KEY = "patientPhotosDir";

type FailReason = "unsupported" | "insecure-context" | "denied" | "error";

export type SaveToFolderResult =
    | { ok: true }
    | { ok: false; reason: FailReason; detail?: string };

function isSupported(): boolean {
    return typeof window !== "undefined" && !!(window as any).showDirectoryPicker;
}

function openHandleDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE_NAME);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getStoredDirHandle(): Promise<any | null> {
    try {
        const db = await openHandleDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch {
        return null;
    }
}

async function storeDirHandle(handle: any): Promise<void> {
    try {
        const db = await openHandleDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        // Persistence failed (e.g. private browsing) — feature still works
        // for the rest of this page session via the in-memory handle.
    }
}

async function ensureReadWritePermission(handle: any): Promise<boolean> {
    const opts = { mode: "readwrite" };
    if ((await handle.queryPermission(opts)) === "granted") return true;
    if ((await handle.requestPermission(opts)) === "granted") return true;
    return false;
}

async function getPatientPhotosDirHandle(): Promise<
    { ok: true; handle: any } | { ok: false; reason: FailReason; detail?: string }
> {
    if (typeof window !== "undefined" && !window.isSecureContext) {
        return { ok: false, reason: "insecure-context" };
    }
    if (!isSupported()) {
        return { ok: false, reason: "unsupported" };
    }

    const stored = await getStoredDirHandle();
    if (stored && (await ensureReadWritePermission(stored))) {
        return { ok: true, handle: stored };
    }

    try {
        const parentHandle = await (window as any).showDirectoryPicker({
            id: "patient-photos-parent",
            mode: "readwrite",
            startIn: "downloads",
        });
        const photosHandle = await parentHandle.getDirectoryHandle("PatientPhotos", {
            create: true,
        });
        if (!(await ensureReadWritePermission(photosHandle))) {
            return { ok: false, reason: "denied" };
        }
        await storeDirHandle(photosHandle);
        return { ok: true, handle: photosHandle };
    } catch (err: any) {
        // AbortError = user closed/cancelled the picker dialog.
        const reason = err?.name === "AbortError" ? "denied" : "error";
        return { ok: false, reason, detail: err?.message || String(err) };
    }
}

// Writes the blob into the PatientPhotos folder. The caller can inspect the
// result to fall back to a plain browser download and/or explain to the
// operator why the direct folder save didn't happen.
export async function savePatientPhotoToFolder(
    blob: Blob,
    filename: string,
): Promise<SaveToFolderResult> {
    const dirHandleResult = await getPatientPhotosDirHandle();
    if (!dirHandleResult.ok) {
        console.warn(
            `[patientPhotoFolder] Skipping direct folder save: ${dirHandleResult.reason}`,
            dirHandleResult.detail || "",
        );
        return dirHandleResult;
    }

    try {
        const fileHandle = await dirHandleResult.handle.getFileHandle(filename, {
            create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { ok: true };
    } catch (err: any) {
        console.error("Failed to write patient photo to PatientPhotos folder:", err);
        return { ok: false, reason: "error", detail: err?.message || String(err) };
    }
}
