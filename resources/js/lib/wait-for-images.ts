// Helper to ensure all images in a container (or a list of URLs) are fully fetched,
// loaded, and decoded into memory before displaying or printing the report.
// Prevents blank or delayed header/footer banners, fingerprints, QR codes, or X-rays.

/**
 * Preload a list of image URLs in parallel and resolve when all are cached & decoded.
 */
export function preloadImageUrls(
    urls: (string | null | undefined)[],
    timeoutMs = 5000,
): Promise<void> {
    const validUrls = Array.from(
        new Set(
            urls.filter(
                (u): u is string => typeof u === "string" && u.trim().length > 0,
            ),
        ),
    );

    if (validUrls.length === 0) {
        return Promise.resolve();
    }

    const loadOne = (url: string) =>
        new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;

            if (img.complete && img.naturalWidth > 0) {
                if ("decode" in img) {
                    img.decode().then(resolve).catch(resolve);
                } else {
                    resolve();
                }
                return;
            }

            const finish = () => {
                img.onload = null;
                img.onerror = null;
                if ("decode" in img && img.naturalWidth > 0) {
                    img.decode().then(resolve).catch(resolve);
                } else {
                    resolve();
                }
            };

            img.onload = finish;
            img.onerror = () => resolve(); // Resolve gracefully on error without blocking
        });

    const allSettled = Promise.all(validUrls.map(loadOne)).then(() => {});
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));

    return Promise.race([allSettled, timeout]);
}

/**
 * window.print() and PDF exporters print whatever the DOM looks like at the moment
 * called — it does NOT wait for images to finish loading first.
 * Call this before window.print() to make sure everything has actually loaded & decoded.
 */
export function waitForImagesToLoad(
    root: Document | HTMLElement = document,
    timeoutMs = 8000,
): Promise<void> {
    const images = Array.from(root.querySelectorAll("img"));
    const pending = images.filter((img) => !img.complete || (img.complete && img.naturalWidth === 0 && img.src));

    if (pending.length === 0) {
        return Promise.resolve();
    }

    const waitForOne = (img: HTMLImageElement) =>
        new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
                if ("decode" in img) {
                    img.decode().then(resolve).catch(resolve);
                } else {
                    resolve();
                }
                return;
            }

            const done = () => {
                img.removeEventListener("load", done);
                img.removeEventListener("error", done);
                if ("decode" in img && img.naturalWidth > 0) {
                    img.decode().then(resolve).catch(resolve);
                } else {
                    resolve();
                }
            };

            img.addEventListener("load", done);
            img.addEventListener("error", done);
        });

    const allSettled = Promise.all(pending.map(waitForOne)).then(() => {});
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));

    return Promise.race([allSettled, timeout]);
}
