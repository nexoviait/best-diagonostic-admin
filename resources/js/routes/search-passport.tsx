import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
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
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      // The report container width is 794px. We add 32px padding (px-4 = 16px on left and right)
      // total width required = 794 + 32 = 826px.
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

  const logoSrc = settings?.logo_path || "/assets/images/best-logo.png";
  const companyNameEn = settings?.company_name_en || "BEST HEALTH DIAGNOSTIC LTD.";

  const companyNameBn = settings?.company_name_bn || "বেস্ট হেলথ্ ডায়াগনস্টিক লিমিটেড";
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
          position: 'relative',
          width: '794px',
          height: '1122px',
          transform: 'none',
          transformOrigin: 'top left'
        }
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm

      // Calculate relative height using the fixed 794px width
      const imgHeight = (1122 * imgWidth) / 794;
      const finalHeight = imgHeight > pageHeight ? pageHeight : imgHeight;

      pdf.addImage(dataUrl, "PNG", 0, 0, imgWidth, finalHeight, undefined, 'FAST');
      pdf.save(`Medical_Report_${PassportNo}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF dynamically:", error);
      window.print();
    }
  };

  // Common cell styles for consistency
  const cellBorder = '1px solid black';
  const cellPad = '2px 4px';
  const fs8 = '10px';
  const fs85 = '11px';
  const fs9 = '12px';
  const fs10 = '10px';

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 print:bg-white print:p-0">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-container {
            width: 210mm !important;
            height: 297mm !important;
            border: 1px solid #000000 !important;
            padding: 10mm 12mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            transform: none !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Action Buttons */}
      <div className="mx-auto mb-6 flex flex-col sm:flex-row gap-4 max-w-[794px] justify-between items-stretch sm:items-center no-print bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Button asChild variant="outline" className="text-xs w-full sm:w-auto justify-center">
          <Link to="/medical">← Search Again</Link>
        </Button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
          <label className="flex items-center justify-between sm:justify-start gap-2.5 cursor-pointer select-none bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
            <span className="text-xs font-bold text-slate-700">Print Header & Footer</span>
            <input
              type="checkbox"
              checked={showHeaderFooter}
              onChange={(e) => setShowHeaderFooter(e.target.checked)}
              className="h-4.5 w-4.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
            />
          </label>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => window.print()} className="flex-1 sm:flex-initial bg-[#0f172a] hover:bg-[#1e293b] text-xs gap-1.5 font-bold justify-center">
              <Printer className="h-3.5 w-3.5" /> Print Report
            </Button>
            <Button onClick={handleDownloadPDF} className="flex-1 sm:flex-initial bg-[#0d9488] hover:bg-[#0b7a70] text-xs gap-1.5 font-bold justify-center">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Report Wrapper to handle responsive scaling on mobile */}
      <div 
        className="w-full flex justify-center items-start overflow-hidden print:overflow-visible print:block"
        style={{
          height: scale < 1 ? `${1122 * scale}px` : 'auto',
        }}
      >
        <div
          style={{
            width: scale < 1 ? `${794 * scale}px` : '794px',
            height: scale < 1 ? `${1122 * scale}px` : '1122px',
            position: scale < 1 ? 'relative' : 'static',
            overflow: scale < 1 ? 'hidden' : 'visible',
          }}
          className="print:w-auto print:h-auto print:static print:visible"
        >
          {/* Main Report Container */}
          <div
            ref={containerRef}
            className="print-container relative overflow-hidden shrink-0"
            style={{
              width: '794px',
              height: '1122px',
              border: '1px solid #000000',
              backgroundColor: '#ffffff',
              padding: '20px 28px',
              boxSizing: 'border-box',
              fontFamily: 'Arial, Helvetica, sans-serif',
              color: '#000000',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: scale < 1 ? 'absolute' : 'relative',
              left: scale < 1 ? '50%' : 'auto',
              top: scale < 1 ? '0' : 'auto',
              transform: scale < 1 ? `translate(-50%, 0) scale(${scale})` : 'none',
              transformOrigin: 'top center',
              zIndex: 1
            }}
          >
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none opacity-[0.04] print:opacity-[0.04]">
          <img src={logoSrc} style={{ width: '400px', height: 'auto', objectFit: 'contain' }} alt="Watermark" />
        </div>

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>

          <div>
            {showHeaderFooter && (
              <div style={{ marginBottom: '4px' }}>
                {settings?.report_header_image_path ? (
                  <img
                    src={settings.report_header_image_path}
                    alt="Report Header"
                    className="w-full h-auto object-contain relative z-10"
                  />
                ) : (
                  <>
                    {/* Top Slanted Ribbon */}
                    <div className="absolute top-[-20px] right-[-28px] flex h-4 w-48 overflow-hidden select-none pointer-events-none z-20" style={{ transform: 'skewX(-35deg) translate(30px, 0)' }}>
                      <div className="flex-1 bg-[#16a34a]" />
                      <div className="w-1.5 bg-white" />
                      <div className="w-4 bg-[#dc2626]" />
                      <div className="w-1.5 bg-white" />
                      <div className="w-8 bg-[#16a34a]" />
                    </div>

                    {/* Report Header Logo & Title */}
                    <div className="flex items-center gap-4 pb-1 mb-1 relative z-10">
                      <img src={logoSrc} className="h-14 w-auto object-contain shrink-0" alt="Best Logo" />
                      <div className="flex-1 text-left">
                        <h1 className="text-[22px] font-black text-red-600 leading-none tracking-tight font-display" style={{ margin: 0, padding: 0 }}>{companyNameEn}</h1>
                        <h2 className="text-[18px] font-bold text-[#16a34a] leading-none font-bengali mt-1.5" style={{ margin: 0, padding: 0 }}>{companyNameBn}</h2>
                      </div>
                    </div>

                    {/* Header Underline with Red Dot */}
                    <div className="w-full border-b-[2px] border-[#16a34a] relative mb-1 z-10">
                      <div className="absolute right-4 -top-[3px] h-1.5 w-1.5 rounded-full bg-red-600" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Medical Report Title */}
            <div style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px', color: '#000000' }}>
              Medical Report
            </div>

            {/* Patient Details Meta Table + Image */}
            <div style={{ display: 'flex', gap: '4px', width: '100%', marginBottom: '4px', alignItems: 'stretch' }}>
              <div style={{ flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '2px', margin: 0 }}>
                  <colgroup>
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '16%' }} />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', backgroundColor: '#ffffff' }}>Id No :</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', textAlign: 'center' }}>{patient.pax_id}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', backgroundColor: '#ffffff' }}>Examined :</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, textAlign: 'center' }}>{formatDate(patient.date)}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', backgroundColor: '#ffffff' }}>Expired :</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', textAlign: 'center' }}>{getExpiryDate(patient.date)}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', backgroundColor: '#ffffff' }}>Name :</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }} colSpan={2}>{patient.first_name} {patient.last_name || ""}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, textAlign: 'center' }}><span style={{ fontWeight: 'bold' }}>Age:</span> {calculateAge(patient.dob)}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', backgroundColor: '#ffffff' }}>Nationality :</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', textAlign: 'center' }}>Bangladeshi</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', backgroundColor: '#ffffff' }}>F/H Name :</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }} colSpan={2}>{patient.father_name || "N/A"}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, textAlign: 'center' }}><span style={{ fontWeight: 'bold' }}>Sex:</span> {patient.sex || "N/A"}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', backgroundColor: '#ffffff' }}>Passport No :</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', textAlign: 'center' }}>{patient.passport_no || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', backgroundColor: '#ffffff' }}>Traveling To :</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }}>{patient.country?.name || "N/A"}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', backgroundColor: '#ffffff' }}>Agency :</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }} colSpan={3}>{patient.agency?.name || "N/A"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ width: '95px', flexShrink: 0, border: cellBorder, backgroundColor: '#f8d7da', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px 0', overflow: 'hidden' }}>
                {patient.image_url ? (
                  <img src={patient.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Patient Photo" />
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#000000' }}>IMAGE</span>
                )}
              </div>
            </div>

            {/* Two-Column Grid: Physical/Medical Exam vs Lab Investigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '0px' }}>

              {/* Left Column */}
              <div style={{ width: '49%' }}>

                {/* 1. Physical Examination */}
                <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '4px' }}>
                  <thead>
                    <tr>
                      <th style={{ backgroundColor: '#eeeeee', border: cellBorder, padding: '2px', textAlign: 'center', fontSize: fs9, fontWeight: 'bold' }} colSpan={4}>PHYSICAL EXAMINATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold', width: '30%' }}>HEIGHT</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center', width: '20%' }}>{mr.height || "00 Feet 00 Inch"}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold', width: '30%' }}>WEIGHT</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'right', width: '20%' }}>{mr.weight ? `${mr.weight} KG` : "00 KG"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>PULSE</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center' }}>{mr.pulse || "00"} <span style={{ fontSize: '9px' }}>/Min</span></td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>B.P.</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'right' }}>{mr.bp || "000/00 mm/Hg"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>LIVER</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center' }}>{mr.liver || "NORMAL"}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>SPLEEN</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center' }}>{mr.spleen || "NORMAL"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>LEFT EYE</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center', fontWeight: 'bold' }}>{mr.eye_left || "6/6"}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>RIGHT EYE</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center', fontWeight: 'bold' }}>{mr.eye_right || "6/6"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>LEFT EAR</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center' }}>{mr.ear_left || "NAD"}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>RIGHT EAR</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center' }}>{mr.ear_right || "NAD"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>HERNIA</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center' }}>{mr.hernia || "ABSENT"}</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>SKIN</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center' }}>{mr.skin || "CLEAR"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold' }}>DEFORMITIES :</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center' }} colSpan={3}>{mr.deformities || "NOT FOUND"}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 2. Medical Examination */}
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ backgroundColor: '#eeeeee', border: cellBorder, padding: '3px 2px', textAlign: 'center', fontSize: fs9, fontWeight: 'bold' }} colSpan={3}>MEDICAL EXAMINATION</th>
                    </tr>
                    <tr>
                      <th style={{ border: cellBorder, padding: '2px 4px', fontSize: fs85, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff' }} colSpan={2}>Type of the Examination</th>
                      <th style={{ border: cellBorder, padding: '2px', textAlign: 'center', fontSize: fs10, fontWeight: 'bold', width: '150px', backgroundColor: '#ffffff' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Others */}
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff', width: '100px' }} rowSpan={2}>OTHERS</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Varicose Veins</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: 'bold', textAlign: 'center' }}>{mr.varicose_veins || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Psychiatry</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: 'bold', textAlign: 'center' }}>{mr.psychiatry || "N/A"}</td>
                    </tr>

                    {/* Drug Test */}
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff' }} rowSpan={3}>DRUG TEST</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>DOP-THC</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: 'bold', textAlign: 'center' }}>{mr.dop_thc || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>DOP-OPI</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: 'bold', textAlign: 'center' }}>{mr.dop_opi || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>DOP-AMP</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: 'bold', textAlign: 'center' }}>{mr.dop_amp || "N/A"}</td>
                    </tr>

                    {/* Full Blood Count */}
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff' }} rowSpan={11}>FULL BLOOD COUNT</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Hemoglobin</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontSize: fs10, fontWeight: 'bold' }}>{mr.hemoglo || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>11.4 g/dl</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>ESR</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontSize: fs10, fontWeight: 'bold' }}>{mr.esr || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>&lt;30mm 1<sup>st</sup> hr</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>RBS</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontSize: fs10, fontWeight: 'bold' }}>{mr.rbs || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>4.5-5.5</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Platelets</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontSize: fs10, fontWeight: 'bold' }}>{mr.platelets || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>150-400</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>WBC</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontSize: fs10, fontWeight: 'bold' }}>{mr.wbc || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>4.0-11.0</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Neutrophils</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontSize: fs10, fontWeight: 'bold' }}>{mr.neutrophils || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>40-75%</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Lymphocytes</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontSize: fs10, fontWeight: 'bold' }}>{mr.lymphocytes || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>20-40%</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Eosinophils</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontSize: fs10, fontWeight: 'bold' }}>{mr.eosinophils || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>02-08%</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Monocytes</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontSize: fs10, fontWeight: 'bold' }}>{mr.monocytes || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>01-07%</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Basophils</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontSize: fs10, fontWeight: 'bold' }}>{mr.basophils || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>&lt;01%</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Blood Group</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, textAlign: 'center', fontWeight: 'bold' }}>{mr.bld_group || "N/A"}</td>
                    </tr>

                    {/* ECG */}
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold', backgroundColor: '#ffffff' }} colSpan={2}>ELECTRO CARDIOGRAPH (ECG)</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: 'bold', textAlign: 'center' }}>{mr.ecg || "N/A"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right Column */}
              <div style={{ width: '51%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                {/* 1. Laboratory Investigation */}
                <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '4px' }}>
                  <thead>
                    <tr>
                      <th style={{ backgroundColor: '#eeeeee', border: cellBorder, padding: '3px 2px', textAlign: 'center', fontSize: fs9, fontWeight: 'bold' }} colSpan={3}>Laboratory Investigation</th>
                    </tr>
                    <tr>
                      <th style={{ border: cellBorder, padding: '2px 4px', fontSize: fs85, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff' }} colSpan={2}>Type of the Examination</th>
                      <th style={{ border: cellBorder, padding: '2px', textAlign: 'center', fontSize: fs85, fontWeight: 'bold', backgroundColor: '#ffffff' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Urine R/M/E */}
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff', width: '70px' }} rowSpan={3}>URINE R/M/E</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Sugar</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontWeight: 'bold' }}>{mr.suger || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>Nill</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Albumin</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontWeight: 'bold' }}>{mr.albumin || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>&lt;20</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Pregnancy</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center' }}>{mr.pregnancy || "N/A"}</td>
                    </tr>

                    {/* Blood Biochemistry */}
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff' }} rowSpan={8}>BLOOD-<br />BIOCHEMISTRY</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>R.B.S</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontWeight: 'bold' }}>{mr.rbs || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>&lt;7.5 mmol/L</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>S. Bilirubin</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontWeight: 'bold' }}>{mr.s_bili || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>&lt;1.2 mg/dl</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>SGPT</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontWeight: 'bold' }}>{mr.sgpt || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>&lt;45 U/L</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>SGOT</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontWeight: 'bold' }}>{mr.sgot || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>&lt;35 U/L</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>S. Creatinine</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontWeight: 'bold' }}>{mr.s_creati || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>&lt;1.4 mg/dl</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Lipid Profile</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontWeight: 'bold' }}>{mr.lipid_profile_tg || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>&lt;150 mg/dl</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>TSH</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontWeight: 'bold' }}>{mr.tsh || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>0.3 - 4.5</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Total T4</td>
                      <td style={{ border: cellBorder, padding: '0', fontSize: fs85 }}>
                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                          <div style={{ flex: 1, padding: cellPad, textAlign: 'center', fontWeight: 'bold' }}>{mr.total_t4 || "00"}</div>
                          <div style={{ width: '85px', padding: cellPad, textAlign: 'right', fontSize: '10px' }}>3.2 - 12.6</div>
                        </div>
                      </td>
                    </tr>

                    {/* Serology */}
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff' }} rowSpan={5}>BLOOD-ELISA &<br />SEROLOGY</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>HIV I & HIV II</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center', fontWeight: 'bold' }}>{mr.hiv || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>HBsAg</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center', fontWeight: 'bold' }}>{mr.hbsag || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Anti HCV</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center', fontWeight: 'bold' }}>{mr.hcv || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>TPHA</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center', fontWeight: 'bold' }}>{mr.tpha || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>VDRL</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center', fontWeight: 'bold' }}>{mr.vdrl || "N/A"}</td>
                    </tr>

                    {/* X-Ray Investigation */}
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ffffff' }} rowSpan={2}>X-RAY<br />INVESTIGATION</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Chest X-Ray</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: '8.5px', textAlign: 'center', verticalAlign: 'top', lineHeight: '1.3' }}>{xray.result || "Normal"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Remarks</td>
                      <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: 'center' }}>{xray.findings || "N/A"}</td>
                    </tr>
                  </tbody>
                </table>

                {/* X-Ray box, Fingerprint, and Doctor Signature */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 2px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                    {/* X-RAY Image Box */}
                    <div style={{ width: '115px', height: '160px', border: cellBorder, backgroundColor: '#f8d7da', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
                      {xray.image_url ? (
                        <img src={xray.image_url} alt="X-Ray" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#000000' }}>X-RAY</span>
                      )}
                    </div>

                    {/* Fingerprint Circle */}
                    <div style={{ width: '115px', height: '115px', border: cellBorder, borderRadius: '50%', backgroundColor: '#f8d7da', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
                      {patient.fingerprint_url ? (
                        <img src={patient.fingerprint_url} alt="Fingerprint" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#000000', textTransform: 'uppercase', textAlign: 'center' }}>FINGERPRINT</span>
                      )}
                    </div>
                  </div>

                  {/* Signature block */}
                  <div style={{ textAlign: 'center', width: '130px' }}>
                    <div style={{ height: '45px', display: 'flex', alignItems: 'end', justifyContent: 'center', marginBottom: '3px' }}>
                      {settings?.signature_physician_path ? (
                        <img src={settings.signature_physician_path} style={{ height: '40px', width: 'auto', objectFit: 'contain' }} alt="Signature" />
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>Physician Sign</span>
                      )}
                    </div>
                    <div style={{ borderTop: '1px dotted black', paddingTop: '2px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#000000', textTransform: 'uppercase', margin: '0' }}>Signature of Chief Physician</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Remarks / QR code section */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', paddingTop: '6px', marginTop: '6px' }}>
              <div style={{ textAlign: 'center', width: '70px', flexShrink: 0 }}>
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '70px', height: '70px', border: '1px solid #000' }} />
              </div>
              <div style={{ flex: 1, fontSize: '11px', lineHeight: '1.35' }}>
                <div>
                  <strong>Remarks: Medical Report for </strong>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{patient.first_name} {patient.last_name || ""}</span>
                  <strong> is Medically </strong>
                </div>
                <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <strong>Info:</strong>
                  <span
                    style={{
                      backgroundColor: (mr.final_status || "UNFIT").toUpperCase() === "FIT" ? "#16a34a" : "#dc2626",
                      color: '#ffffff',
                      fontWeight: 'bold',
                      padding: '1px 6px',
                      fontSize: '12px',
                      display: 'inline-block'
                    }}
                  >
                    {(mr.final_status || "UNFIT").toUpperCase()}
                  </span>
                </div>
                <div style={{ marginTop: '2px', fontSize: '10px' }}>
                  <strong>Comment: </strong>
                  <span>{xray.remark || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Footer Bangla Notice */}
            <div style={{ borderTop: showHeaderFooter ? '2px solid #16a34a' : 'none', marginTop: 'auto', paddingTop: '4px', textAlign: 'center' }}>
              <p style={{ color: '#000000', fontWeight: 'bold', fontSize: '11px', margin: '0' }}>
                মেডিকেল রিপোর্ট এর তথ্যটি সঠিক আছে কিনা জানার জন্য আমাদের ওয়েব সাইটে ভিজিট করুন অথবা QR Code স্ক্যান করুন।
              </p>

              {showHeaderFooter && (
                settings?.report_footer_image_path ? (
                  <img
                    src={settings.report_footer_image_path}
                    alt="Report Footer"
                    style={{ marginTop: '3px' }}
                    className="w-full h-auto object-contain mx-auto"
                  />
                ) : (
                  <div style={{ marginTop: '3px' }}>
                    <p style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', margin: '0', letterSpacing: '0.5px' }}>
                      {companyAddressEn}
                    </p>
                    <p style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '11px', margin: '2px 0 0 0' }}>
                      {companyPhoneEn}
                    </p>
                    <p style={{ color: '#dc2626', fontWeight: 'extrabold', fontSize: '12px', margin: '2px 0 0 0', letterSpacing: '0.5px' }}>
                      www.bestdiagnostic.com.bd
                    </p>
                  </div>
                )
              )}
            </div>

          </div>
        </div>

      </div>
      </div>
      </div>

      {/* Web Footer / Copyright (no-print) */}
      <div className="mx-auto max-w-[794px] text-center mt-6 text-[10px] text-gray-500 space-y-0.5 no-print leading-relaxed select-none">
        <p>© {new Date().getFullYear()} {companyNameEn}. All Rights Reserved.</p>
        <p className="font-semibold text-gray-700">Developed by Nexovia IT Limited</p>
      </div>
    </div>
  );
}
