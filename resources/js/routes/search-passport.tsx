import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { Loader2, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MedicalReportView } from "@/components/medical-report-view";
import { toast } from "sonner";

export const Route = createFileRoute("/search-passport")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      PassportNo: (search.PassportNo as string) || "",
    };
  },
  component: SearchPassportPage,
});

function SearchPassportPage() {
  const { PassportNo } = Route.useSearch() as { PassportNo: string };
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 826) {
        const newScale = (window.innerWidth - 32) / 794;
        setScale(newScale);
      } else {
        setScale(1);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["public-report", PassportNo],
    queryFn: () => apiRequest(`/public/check-report?PassportNo=${PassportNo}`),
    enabled: !!PassportNo,
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["public-settings"],
    queryFn: () => apiRequest("/public/site-settings"),
  });

  const companyNameEn = settings?.company_name_en || "BEST HEALTH DIAGNOSTIC LTD.";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0d9488]" />
          <p className="mt-2 text-sm text-gray-500">Loading medical report...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center bg-white p-8 rounded-md shadow-sm border">
          <h2 className="text-lg font-semibold text-destructive">Report Not Found</h2>
          <p className="mt-2 text-sm text-gray-500">
            No medical report could be found for Passport No / Pax ID: <strong>{PassportNo}</strong>
          </p>
          <div className="mt-6">
            <Button asChild className="bg-[#0d9488] hover:bg-[#0b7a70]">
              <Link to="/medical">Back to Search</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    const element = document.querySelector(".print-container") as HTMLElement;
    if (!element) return;

    try {
      // @ts-ignore
      const { toPng } = await import("html-to-image");
      // @ts-ignore
      const { jsPDF } = await import("jspdf");

      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2.2,
        backgroundColor: '#ffffff',
        style: {
          margin: '0',
          left: '0',
          top: '0',
          position: 'relative',
          width: '794px',
          height: '1122px',
          transform: 'none',
          transformOrigin: 'top left'
        }
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (1122 * imgWidth) / 794;
      const finalHeight = imgHeight > pageHeight ? pageHeight : imgHeight;

      pdf.addImage(dataUrl, "PNG", 0, 0, imgWidth, finalHeight, undefined, 'FAST');
      pdf.save(`Medical_Report_${PassportNo}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF dynamically:", error);
      toast.error("Couldn't generate the PDF directly — opening print dialog instead. Use \"Save as PDF\" there.");
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 print:bg-white print:p-0">
      {/* Action Buttons */}
      <div className="mx-auto mb-6 flex flex-col sm:flex-row gap-4 max-w-[794px] justify-between items-stretch sm:items-center no-print bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Button asChild variant="outline" className="text-xs w-full sm:w-auto justify-center">
          <Link to="/medical">← Search Again</Link>
        </Button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => window.print()} className="flex-1 sm:flex-initial gradient-primary text-xs gap-1.5 font-bold justify-center">
              <Printer className="h-3.5 w-3.5" /> Print Report
            </Button>
            <Button onClick={handleDownloadPDF} className="flex-1 sm:flex-initial gradient-primary text-xs gap-1.5 font-bold justify-center">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-center min-w-0 overflow-hidden">
        <MedicalReportView
          patient={patient}
          settings={settings}
          scale={scale}
          containerRef={containerRef}
        />
      </div>

      {/* Web Footer / Copyright (no-print) */}
      <div className="mx-auto max-w-[794px] text-center mt-6 text-[10px] text-gray-500 space-y-0.5 no-print leading-relaxed select-none">
        <p>© {new Date().getFullYear()} {companyNameEn}. All Rights Reserved.</p>
        <p className="font-semibold text-gray-700">Developed by Nexovia IT Limited</p>
      </div>
    </div>
  );
}
