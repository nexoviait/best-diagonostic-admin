import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useState } from "react";
import { Loader2, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [showHeaderFooter, setShowHeaderFooter] = useState(true);

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["public-report", PassportNo],
    queryFn: () => apiRequest(`/public/check-report?PassportNo=${PassportNo}`),
    enabled: !!PassportNo,
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["public-settings"],
    queryFn: () => apiRequest("/public/site-settings"),
  });

  const logoSrc = settings?.logo_path || "/assets/images/best-logo.png";
  const companyNameEn = settings?.company_name_en || "BEST HEALTH DIAGNOSTIC LTD.";

  const companyNameBn = settings?.company_name_bn || "বেস্ট হেলথ্ ডায়াগনস্টিক লিমিটেড";
  const companyAddressEn = settings?.company_address_en || "1/A, D.I.T Extention Road, Alauddin Bhaban (3rd Floor), Fakirapool, Motijheel, Dhaka-1000";
  const companyPhoneEn = settings?.company_phone_en || "Phone: 01618888911, 01841775991, 01770044337, email: besthealth.bhdl@gmail.com";


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

  const mr = patient.medical_report || {};
  const xray = patient.xray_report || {};

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    if (year && month && day) {
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  const getExpiryDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + 3);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calculateAge = (dobStr: string) => {
    if (!dobStr) return "N/A";
    const birthDate = new Date(dobStr);
    if (isNaN(birthDate.getTime())) return dobStr; // If it's a plain string like "25" or not parseable
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const qrCodeUrl = typeof window !== "undefined" ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.href)}` : "";

  const handleDownloadPDF = async () => {
    const element = document.querySelector(".print-container") as HTMLElement;
    if (!element) return;

    try {
      // @ts-ignore
      const { toPng } = await import("html-to-image");
      // @ts-ignore
      const { jsPDF } = await import("jspdf");

      // Generate high-resolution PNG image of the element with overridden styles to prevent shift
      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2.2,
        backgroundColor: '#ffffff',
        style: {
          margin: '0',
          left: '0',
          top: '0',
          width: '800px'
        }
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm

      // Calculate relative height using the fixed 800px width
      const imgHeight = (element.clientHeight * imgWidth) / 800;
      const finalHeight = imgHeight > pageHeight ? pageHeight : imgHeight;

      pdf.addImage(dataUrl, "PNG", 0, 0, imgWidth, finalHeight, undefined, 'FAST');
      pdf.save(`Medical_Report_${PassportNo}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF dynamically:", error);
      // Bulletproof fallback: trigger standard print dialog
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 print:bg-white print:p-0">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }
        .print-container {
          font-family: 'Hind Siliguri', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background-color: #fff;
            color: #000;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          table {
            font-size: 8px !important;
          }
          td, th {
            padding: 1.5px 3px !important;
          }
          .mb-5 {
            margin-bottom: 6px !important;
          }
          .mb-4 {
            margin-bottom: 5px !important;
          }
          .pb-3 {
            padding-bottom: 2px !important;
          }
          .pt-4 {
            padding-top: 4px !important;
          }
          .mt-2 {
            margin-top: 3px !important;
          }
          .py-3 {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
          .h-24 {
            height: 70px !important;
            width: 70px !important;
          }
          .w-24 {
            width: 70px !important;
            height: 70px !important;
          }
          .h-16 {
            height: 44px !important;
          }
          .watermark-img {
            width: 380px !important;
          }
          .text-2xl {
            font-size: 16px !important;
          }
          .text-xl {
            font-size: 14px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Action Buttons */}
      <div className="mx-auto mb-6 flex max-w-[800px] justify-between items-center no-print bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Button asChild variant="outline" className="text-xs">
          <Link to="/medical">← Search Again</Link>
        </Button>
        
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer select-none bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={showHeaderFooter}
              onChange={(e) => setShowHeaderFooter(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">Print Header & Footer</span>
          </label>

          <div className="flex gap-2">
            <Button onClick={() => window.print()} className="bg-[#0f172a] hover:bg-[#1e293b] text-xs gap-1.5 font-bold">
              <Printer className="h-3.5 w-3.5" /> Print Report
            </Button>
            <Button onClick={handleDownloadPDF} className="bg-[#0d9488] hover:bg-[#0b7a70] text-xs gap-1.5 font-bold">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Report Container */}
      <div className="mx-auto max-w-[800px] bg-white p-6 shadow-sm border border-gray-200 print:shadow-none print:border-none relative overflow-hidden print-container">

        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none opacity-[0.04] print:opacity-[0.04]">
          <img src={logoSrc} className="w-[500px] h-auto object-contain watermark-img" alt="Watermark" />
        </div>

        {showHeaderFooter && (
          <>
            {/* Top Slanted Ribbon */}
            <div className="absolute top-0 right-0 flex h-4 w-48 overflow-hidden select-none pointer-events-none z-20" style={{ transform: 'skewX(-35deg) translate(30px, 0)' }}>
              <div className="flex-1 bg-[#16a34a]" />
              <div className="w-1.5 bg-white" />
              <div className="w-4 bg-[#dc2626]" />
              <div className="w-1.5 bg-white" />
              <div className="w-8 bg-[#16a34a]" />
            </div>

            {/* Report Header Logo & Title */}
            <div className="flex items-center gap-4 pb-1 mb-2 relative z-10">
              <img src={logoSrc} className="h-16 w-auto object-contain shrink-0" alt="Best Logo" />
              <div className="flex-1 text-left">
                <h1 className="text-[25px] font-black text-red-600 leading-none tracking-tight font-display">{companyNameEn}</h1>
                <h2 className="text-[21px] font-bold text-[#16a34a] leading-none font-bengali mt-2">{companyNameBn}</h2>
              </div>
            </div>

            {/* Header Underline with Red Dot */}
            <div className="w-full border-b-[2.5px] border-[#16a34a] relative mb-4 z-10">
              <div className="absolute right-4 -top-[4px] h-2 w-2 rounded-full bg-red-600" />
            </div>
          </>
        )}

        {/* Medical Report Subtitle Banner */}
        <div className="w-full bg-slate-100 text-center py-1.5 border border-slate-600 font-bold text-sm text-slate-800 tracking-wide mb-4">
          Medical Report
        </div>

        {/* Patient Details Meta Table */}
        <table className="w-full border-collapse border border-slate-600 text-xs mb-4">
          <tbody>
            <tr>
              <td className="w-[78%] p-0 border-none">
                <table className="w-full border-collapse border-none">
                  <tbody>
                    <tr>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50 w-[15%]">Id No :</td>
                      <td className="border border-slate-600 p-1.5 font-mono font-bold text-slate-900 w-[20%]">{patient.pax_id}</td>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50 w-[15%]">Examined :</td>
                      <td className="border border-slate-600 p-1.5 w-[20%]">{formatDate(patient.date)}</td>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50 w-[15%]">Expired :</td>
                      <td className="border border-slate-600 p-1.5 w-[15%]">{getExpiryDate(patient.date)}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50">Name :</td>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-900 text-transform: uppercase" colSpan={3}>{patient.first_name} {patient.last_name || ""}</td>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50">Age :</td>
                      <td className="border border-slate-600 p-1.5 font-semibold">{calculateAge(patient.dob)}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50">F/H Name :</td>
                      <td className="border border-slate-600 p-1.5 font-semibold" colSpan={3}>{patient.father_name || "N/A"}</td>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50">Sex :</td>
                      <td className="border border-slate-600 p-1.5 font-semibold text-transform: uppercase">{patient.sex || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50">Traveling To :</td>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-900 text-transform: uppercase">{patient.country?.name || "N/A"}</td>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50">Agency :</td>
                      <td className="border border-slate-600 p-1.5 font-semibold" colSpan={3}>{patient.agency?.name || "N/A"}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50">Passport No :</td>
                      <td className="border border-slate-600 p-1.5 font-bold font-mono text-slate-900" colSpan={3}>{patient.passport_no || "N/A"}</td>
                      <td className="border border-slate-600 p-1.5 font-bold text-slate-700 bg-slate-50">Nationality :</td>
                      <td className="border border-slate-600 p-1.5">Bangladeshi</td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td className="w-[22%] border border-slate-600 p-1 bg-slate-50 text-center vertical-align: middle">
                {patient.image_url ? (
                  <img src={patient.image_url} className="w-full h-28 object-contain rounded border border-slate-200 bg-white" alt="Patient Photo" />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center border border-dashed border-slate-300 bg-white rounded">
                    <span className="text-[10px] font-bold text-slate-400">PHOTO</span>
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Two-Column Grid: Physical/Medical Exam vs Lab Investigation */}
        <div className="grid grid-cols-2 gap-4 mb-4">

          {/* Left Column: Physical & Medical Examination */}
          <div className="space-y-4">

            {/* 1. Physical Examination */}
            <table className="w-full border-collapse border border-slate-600 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-center font-bold border-b border-slate-600 text-xs text-slate-800">
                  <th className="border border-slate-600 p-1" colSpan={4}>PHYSICAL EXAMINATION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50 w-[20%]">HEIGHT</td>
                  <td className="border border-slate-600 p-1 w-[30%]">{mr.height || "00 Feet 00 Inch"}</td>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50 w-[20%]">WEIGHT</td>
                  <td className="border border-slate-600 p-1 w-[30%]">{mr.weight ? `${mr.weight} KG` : "00 KG"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">PULSE</td>
                  <td className="border border-slate-600 p-1">{mr.pulse || "72 /Min"}</td>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">B.P.</td>
                  <td className="border border-slate-600 p-1 font-semibold">{mr.bp || "120/80 mmHg"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">LIVER</td>
                  <td className="border border-slate-600 p-1">{mr.liver || "NORMAL"}</td>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">SPLEEN</td>
                  <td className="border border-slate-600 p-1">{mr.spleen || "NORMAL"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">LEFT EYE</td>
                  <td className="border border-slate-600 p-1 font-semibold">{mr.eye_left || "6/6"}</td>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">RIGHT EYE</td>
                  <td className="border border-slate-600 p-1 font-semibold">{mr.eye_right || "6/6"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">LEFT EAR</td>
                  <td className="border border-slate-600 p-1">{mr.ear_left || "NAD"}</td>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">RIGHT EAR</td>
                  <td className="border border-slate-600 p-1">{mr.ear_right || "NAD"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">HERNIA</td>
                  <td className="border border-slate-600 p-1">{mr.hernia || "ABSENT"}</td>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">SKIN</td>
                  <td className="border border-slate-600 p-1">{mr.skin || "CLEAR"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50">DEFORMITIES:</td>
                  <td className="border border-slate-600 p-1" colSpan={3}>{mr.deformities || "NOT FOUND"}</td>
                </tr>
              </tbody>
            </table>

            {/* 2. Medical Examination */}
            <table className="w-full border-collapse border border-slate-600 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-center font-bold border-b border-slate-600 text-xs text-slate-800">
                  <th className="border border-slate-600 p-1" colSpan={2}>MEDICAL EXAMINATION</th>
                  <th className="border border-slate-600 p-1 w-20">Result</th>
                </tr>
              </thead>
              <tbody>
                {/* Others group */}
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50 w-[30%]" rowSpan={2}>OTHERS</td>
                  <td className="border border-slate-600 p-1">Varicose Veins</td>
                  <td className="border border-slate-600 p-1 text-center">{mr.varicose_veins || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Psychiatry</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.psychiatry || "N/A"}</td>
                </tr>

                {/* Drug Test group */}
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50" rowSpan={3}>DRUG TEST</td>
                  <td className="border border-slate-600 p-1">DOP-THC</td>
                  <td className="border border-slate-600 p-1 text-center">{mr.dop_thc || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">DOP-OPI</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.dop_opi || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">DOP-AMP</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.dop_amp || "N/A"}</td>
                </tr>

                {/* Full Blood Count group */}
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50" rowSpan={11}>FULL BLOOD COUNT</td>
                  <td className="border border-slate-600 p-1">Hemoglobin</td>
                  <td className="border border-slate-600 p-1 text-center font-semibold">{mr.hemoglo || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">ESR</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.esr || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">RBS</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.rbs || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Platelets</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.platelets || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">WBC</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.wbc || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Neutrophils</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.neutrophils || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Lymphocytes</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.lymphocytes || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Eosinophils</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.eosinophils || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Monocytes</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.monocytes || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Basophils</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.basophils || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Blood Group</td>
                  <td className="border border-slate-600 p-1 text-center font-bold border-t border-slate-300">{mr.bld_group || "N/A"}</td>
                </tr>

                {/* ECG */}
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50" colSpan={2}>ELECTRO CARDIOGRAPH (ECG)</td>
                  <td className="border border-slate-600 p-1 text-center font-semibold">{mr.ecg || "N/A"}</td>
                </tr>
              </tbody>
            </table>

          </div>

          {/* Right Column: Laboratory Investigation, X-Ray image box, and Fingerprint */}
          <div className="space-y-4">

            {/* 1. Laboratory Investigation Table */}
            <table className="w-full border-collapse border border-slate-600 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-center font-bold border-b border-slate-600 text-xs text-slate-800">
                  <th className="border border-slate-600 p-1" colSpan={2}>Laboratory Investigation</th>
                  <th className="border border-slate-600 p-1 w-20">Result</th>
                </tr>
              </thead>
              <tbody>
                {/* Urine R/M/E group */}
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50 w-[30%]" rowSpan={3}>URINE R/M/E</td>
                  <td className="border border-slate-600 p-1">Sugar</td>
                  <td className="border border-slate-600 p-1 text-center">{mr.suger || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Albumin</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.albumin || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Pregnancy</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.pregnancy || "N/A"}</td>
                </tr>

                {/* Blood Biochemistry group */}
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50" rowSpan={8}>BLOOD-BIOCHEMISTRY</td>
                  <td className="border border-slate-600 p-1">R.B.S</td>
                  <td className="border border-slate-600 p-1 text-center">{mr.rbs || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">S. Bilirubin</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.s_bili || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">SGPT</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.sgpt || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">SGOT</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.sgot || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">S. Creatinine</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.s_creati || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Lipid Profile</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.lipid_profile_tg || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">TSH</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.tsh || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Total T4</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{mr.total_t4 || "N/A"}</td>
                </tr>

                {/* Blood ELISA group */}
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50" rowSpan={5}>BLOOD-ELISA & SEROLOGY</td>
                  <td className="border border-slate-600 p-1">HIV I & HIV II</td>
                  <td className="border border-slate-600 p-1 text-center font-bold">{mr.hiv || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">HBsAg</td>
                  <td className="border border-slate-600 p-1 text-center font-bold border-t border-slate-300">{mr.hbsag || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Anti HCV</td>
                  <td className="border border-slate-600 p-1 text-center font-bold border-t border-slate-300">{mr.hcv || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">TPHA</td>
                  <td className="border border-slate-600 p-1 text-center font-bold border-t border-slate-300">{mr.tpha || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">VDRL</td>
                  <td className="border border-slate-600 p-1 text-center font-bold border-t border-slate-300">{mr.vdrl || "N/A"}</td>
                </tr>

                {/* X-Ray Investigation */}
                <tr>
                  <td className="border border-slate-600 p-1 font-bold bg-slate-50" rowSpan={2}>X-RAY INVESTIGATION</td>
                  <td className="border border-slate-600 p-1">Chest X-Ray</td>
                  <td className="border border-slate-600 p-1 text-center">{xray.result || "N/A"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 p-1 border-t border-slate-300">Remarks</td>
                  <td className="border border-slate-600 p-1 text-center border-t border-slate-300">{xray.findings || "N/A"}</td>
                </tr>
              </tbody>
            </table>

            {/* X-Ray box, Fingerprint, and Doctor Signature */}
            <div className="flex justify-between items-end pt-2 px-1">
              <div className="flex gap-4">
                {/* X-RAY Image Upload */}
                <div className="w-[100px] h-[100px] border border-slate-600 flex flex-col justify-center items-center bg-slate-50 overflow-hidden relative">
                  {xray.image_url ? (
                    <img src={xray.image_url} alt="X-Ray Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">X-RAY</span>
                  )}
                </div>

                {/* Fingerprint Circle */}
                <div className="w-[100px] h-[100px] border border-red-400 border-dashed rounded-full flex justify-center items-center bg-red-50/50 overflow-hidden relative">
                  {patient.fingerprint_url ? (
                    <img src={patient.fingerprint_url} alt="Fingerprint" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider text-center">Fingerprint</span>
                  )}
                </div>
              </div>

              {/* Signature block */}
              <div className="text-center w-[140px]">
                <div className="h-16 flex items-end justify-center mb-1">
                  {settings?.signature_physician_path ? (
                    <img src={settings.signature_physician_path} className="h-14 w-auto object-contain" alt="Chief Physician Signature" />
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400">Physician Sign</span>
                  )}
                </div>
                <div className="border-t border-dashed border-slate-500 pt-0.5">
                  <p className="text-[8px] font-bold text-slate-700 uppercase leading-none">Signature of Chief Physician</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Remarks / QR code section */}
        <div className="flex gap-4 items-start border-t border-slate-200 pt-3 mb-2">
          <div className="text-center shrink-0">
            <img src={qrCodeUrl} alt="Verification QR Code" className="h-20 w-20 border border-slate-200" />
            <p className="text-[6.5px] text-slate-500 mt-1 max-w-[80px] leading-tight">
              verify this report scan QR Code
            </p>
          </div>

          <div className="flex-1 text-[10px] space-y-1.5 mt-0.5">
            <div>
              <strong className="text-slate-800">Remarks: Medical Report for </strong>
              <span className="font-bold text-slate-900 text-transform: uppercase">{patient.first_name} {patient.last_name || ""}</span>
              <strong className="text-slate-800"> is Medically Info: </strong>
              <span className={`font-bold px-2 py-0.5 rounded ml-1 text-xs border ${(mr.final_status || "Pending").toUpperCase() === "FIT"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : (mr.final_status || "Pending").toUpperCase() === "UNFIT"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                {(mr.final_status || "Pending").toUpperCase()}
              </span>
            </div>
            <div>
              <strong className="text-slate-800">Comment: </strong>
              <span className="text-slate-700 italic">{mr.comments || "N/A"}</span>
            </div>
          </div>
        </div>

        {showHeaderFooter && (
          <>
            {/* Detailed Address Footer Box */}
            <div className="mt-4 pt-3 border-t-[2.5px] border-[#16a34a] relative leading-tight text-center space-y-1">
              {/* Red dot on the left side of the line */}
              <div className="absolute left-6 -top-[6px] h-2 w-2 rounded-full bg-red-600" />

              {/* Hardcoded standard Bangla verification notice */}
              <p className="text-[#16a34a] font-bold font-bengali text-[10.5px] mb-1">
                মেডিকেল রিপোর্ট এর তথ্যটি সঠিক আছে কিনা জানার জন্য আমাদের ওয়েব সাইটে ভিজিট করুন অথবা QR Code স্ক্যান করুন।
              </p>
              
              <p className="text-[#16a34a] font-bold text-[10px] uppercase tracking-wide">
                {companyAddressEn}
              </p>
              <p className="text-[#16a34a] font-bold text-[10px] tracking-wide">
                {companyPhoneEn}
              </p>
              <p className="text-red-600 font-extrabold text-xs tracking-wider pt-0.5">
                www.bestdiagnostic.com.bd
              </p>
            </div>

            {/* Bottom Slanted Ribbon */}
            <div className="absolute bottom-0 left-0 flex h-4 w-48 overflow-hidden select-none pointer-events-none z-20" style={{ transform: 'skewX(-35deg) translate(-30px, 0)' }}>
              <div className="w-24 bg-[#16a34a]" />
              <div className="w-1.5 bg-white" />
              <div className="w-4 bg-[#dc2626]" />
              <div className="w-1.5 bg-white" />
              <div className="flex-1 bg-[#16a34a]" />
            </div>
          </>
        )}

      </div>

      {/* Web Footer / Copyright (no-print) */}
      <div className="mx-auto max-w-[800px] text-center mt-6 text-[10px] text-gray-500 space-y-0.5 no-print leading-relaxed select-none">
        <p>© {new Date().getFullYear()} {companyNameEn}. All Rights Reserved.</p>
        <p className="font-semibold text-gray-700">Developed by Nexovia IT Limited</p>
      </div>
    </div>
  );
}
