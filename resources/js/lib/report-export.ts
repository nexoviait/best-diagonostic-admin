import { toast } from "sonner";

export interface PdfColumn {
  header: string;
  width: number; // mm — columns are laid out left-to-right starting at the 14mm margin
  align?: "right";
  render: (row: any) => string;
}

export interface CsvColumn {
  header: string;
  render: (row: any) => string | number;
}

export interface SummaryStat {
  label: string;
  value: string;
}

interface ExportPdfOptions {
  filenamePrefix: string;
  reportTitle: string;
  periodLabel: string;
  columns: PdfColumn[];
  rows: any[];
  summary?: SummaryStat[];
  user?: any;
  // One entry per column — null/"" renders as a blank cell. Drawn as a bold,
  // shaded grand-total row under the last data row (e.g. ["TOTAL", "", "12,000.00"]).
  totalsRow?: (string | null)[];
}

// Standard 2-decimal accounting format, e.g. 1234 -> "1,234.00".
export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Fetches an image (e.g. the report header banner) and converts it to a base64
// data URL plus its natural dimensions, since jsPDF's addImage() needs the
// image data itself (not a URL) and the aspect ratio to size it without distortion.
function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL("image/png"), width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

// jsPDF's built-in fonts only cover Latin characters — registers the same Hind
// Siliguri font the rest of the site uses so a Bengali company name can render.
let bengaliFontRegisteredOn: WeakSet<object> | null = null;
async function ensureBengaliFont(doc: any): Promise<boolean> {
  if (!bengaliFontRegisteredOn) bengaliFontRegisteredOn = new WeakSet();
  if (bengaliFontRegisteredOn.has(doc)) return true;

  try {
    const response = await fetch("/fonts/HindSiliguri-Regular.ttf");
    if (!response.ok) return false;
    const buffer = await response.arrayBuffer();

    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64Font = btoa(binary);

    doc.addFileToVFS("HindSiliguri-Regular.ttf", base64Font);
    doc.addFont("HindSiliguri-Regular.ttf", "HindSiliguri", "normal");
    bengaliFontRegisteredOn.add(doc);
    return true;
  } catch {
    return false;
  }
}

// Shared tabular PDF export — company-branded header (logo banner or text
// fallback), a summary stats box, then a paginated striped table whose column
// layout is driven by `columns` widths instead of per-report hardcoded x positions.
export async function exportReportPdf(opts: ExportPdfOptions): Promise<void> {
  const { rows, columns } = opts;
  if (rows.length === 0) {
    toast.warning("No data to export");
    return;
  }

  try {
    // @ts-ignore
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF("p", "mm", "a4");
    let pageNumber = 1;

    const headerImage = opts.user?.report_header_image_path
      ? await loadImageAsDataUrl(opts.user.report_header_image_path).catch(() => null)
      : null;

    const companyNameEn = opts.user?.company_name_en || "BEST HEALTH DIAGNOSTIC LTD.";
    const companyNameBn = opts.user?.company_name_bn || "";
    const canRenderBengali = !headerImage && companyNameBn ? await ensureBengaliFont(doc) : false;

    const usableWidth = 182; // 14mm to 196mm
    const headerImageHeight = headerImage ? (headerImage.height / headerImage.width) * usableWidth : 0;

    const drawHeader = (docInstance: any): number => {
      let y = headerImage ? 2 : 10;

      if (headerImage) {
        try {
          docInstance.addImage(headerImage.dataUrl, "PNG", 14, y, usableWidth, headerImageHeight);
          y += headerImageHeight + 4;
        } catch {
          // Corrupt/unsupported image data — fall through to plain text below.
        }
      } else {
        docInstance.setFont("helvetica", "bold");
        docInstance.setFontSize(14);
        docInstance.setTextColor(15, 23, 42);
        docInstance.text(companyNameEn, 14, y + 6);
        y += 6;

        docInstance.setFontSize(9);
        if (canRenderBengali) {
          docInstance.setFont("HindSiliguri", "normal");
          docInstance.setTextColor(71, 85, 105);
          docInstance.text(companyNameBn, 14, y + 6);
          docInstance.setFont("helvetica", "normal");
        } else {
          docInstance.setFont("helvetica", "normal");
          docInstance.setTextColor(100, 116, 139);
          docInstance.text(opts.reportTitle, 14, y + 6);
        }
        y += 8;
      }

      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(9);
      docInstance.setTextColor(100, 116, 139);
      docInstance.text(opts.periodLabel, 14, y + 4);

      docInstance.setFontSize(8);
      docInstance.text(`Page ${pageNumber}`, 190, y + 4);

      y += 8;
      docInstance.setDrawColor(226, 232, 240);
      docInstance.line(14, y, 196, y);

      return y + 6;
    };

    let y = drawHeader(doc);

    if (opts.summary && opts.summary.length > 0) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, 182, 14, 1.5, 1.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const slotWidth = 182 / opts.summary.length;
      opts.summary.forEach((s, i) => {
        doc.text(`${s.label}: ${s.value}`, 18 + i * slotWidth, y + 9);
      });
      y += 22;
    } else {
      y += 4;
    }

    const colX: number[] = [];
    let cursor = 14;
    columns.forEach((c) => {
      colX.push(cursor);
      cursor += c.width;
    });

    const drawTableHeaderRow = () => {
      doc.setFillColor(15, 23, 42);
      doc.rect(14, y, 182, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      columns.forEach((c, i) => {
        if (c.align === "right") {
          doc.text(c.header, colX[i] + c.width - 2, y + 5.5, { align: "right" });
        } else {
          doc.text(c.header, colX[i] + 2, y + 5.5);
        }
      });

      y += 8;
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
    };

    drawTableHeaderRow();

    rows.forEach((row, index) => {
      if (y > 275) {
        doc.addPage();
        pageNumber++;
        y = drawHeader(doc);
        drawTableHeaderRow();
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 5.5, "F");
      }

      doc.setFontSize(7.5);
      columns.forEach((c, i) => {
        const text = c.render(row);
        if (c.align === "right") {
          doc.text(text, colX[i] + c.width - 2, y + 4, { align: "right" });
        } else {
          doc.text(text, colX[i] + 2, y + 4);
        }
      });

      y += 5.5;
    });

    if (opts.totalsRow && opts.totalsRow.length > 0) {
      if (y > 272) {
        doc.addPage();
        pageNumber++;
        y = drawHeader(doc);
        drawTableHeaderRow();
      }

      doc.setDrawColor(148, 163, 184);
      doc.line(14, y, 196, y);

      doc.setFillColor(226, 232, 240);
      doc.rect(14, y, 182, 7, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      opts.totalsRow.forEach((value, i) => {
        if (!value || !columns[i]) return;
        const c = columns[i];
        if (c.align === "right") {
          doc.text(value, colX[i] + c.width - 2, y + 5, { align: "right" });
        } else {
          doc.text(value, colX[i] + 2, y + 5);
        }
      });

      y += 7;
    }

    doc.save(`${opts.filenamePrefix}_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF generated and downloaded successfully!");
  } catch (err) {
    console.error(err);
    toast.error("Failed to generate PDF file.");
  }
}

// "Excel" export — a CSV download, matching the rest of the site's convention
// (no real .xlsx library is used anywhere in this codebase). `totalsRow`, when
// given, is appended as a final row (e.g. ["TOTAL", "", "", "12,000.00"]).
export function exportReportCsv(
  columns: CsvColumn[],
  rows: any[],
  filenamePrefix: string,
  totalsRow?: (string | number)[],
): void {
  if (rows.length === 0) {
    toast.warning("No data to export");
    return;
  }

  const headers = columns.map((c) => c.header);
  const dataRows = rows.map((row) => columns.map((c) => c.render(row)));
  if (totalsRow && totalsRow.length > 0) {
    dataRows.push(totalsRow);
  }

  const csvContent = [
    headers.join(","),
    ...dataRows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filenamePrefix}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success("Excel (CSV) file downloaded successfully!");
}
