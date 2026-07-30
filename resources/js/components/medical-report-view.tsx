import React, { useRef } from "react";

interface FormValues {
  height?: string;
  weight?: string;
  pulse?: string;
  bp?: string;
  liver?: string;
  spleen?: string;
  eyeRight?: string;
  eyeLeft?: string;
  earRight?: string;
  earLeft?: string;
  hernia?: string;
  skin?: string;
  deformities?: string;
  varicoseVeins?: string;
  psychiatry?: string;
  dopThc?: string;
  dopOpi?: string;
  dopAmp?: string;
  hemoglo?: string;
  esr?: string;
  dc?: string;
  rbc?: string;
  tc?: string;
  rbs?: string;
  platelets?: string;
  wbc?: string;
  neutrophils?: string;
  lymphocytes?: string;
  eosinophils?: string;
  monocytes?: string;
  basophils?: string;
  bldGroup?: string;
  ecg?: string;
  suger?: string;
  albumin?: string;
  pregnancy?: string;
  sBili?: string;
  sgpt?: string;
  sgot?: string;
  sCreati?: string;
  sUrea?: string;
  lipidProfileTg?: string;
  tsh?: string;
  totalT4?: string;
  hiv?: string;
  hbsag?: string;
  hcv?: string;
  tpha?: string;
  vdrl?: string;
  comments?: string;
  finalStatus?: string;
  heart?: string;
  hCeol?: string;
  malaria?: string;
}

interface MedicalReportViewProps {
  patient: any;
  formValues?: FormValues;
  settings?: any;
  scale?: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function MedicalReportView({
  patient,
  formValues,
  settings,
  scale = 1,
  containerRef: externalContainerRef,
}: MedicalReportViewProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalRef;

  const mr = patient?.medical_report || {};
  const xray = patient?.xray_report || {};

  const logoSrc = settings?.logo_path || "/assets/images/best-logo.png";
  const companyNameEn = settings?.company_name_en || "BEST HEALTH DIAGNOSTIC LTD.";
  const companyNameBn = settings?.company_name_bn || "বেস্ট হেলথ্ ডায়াগনস্টিক লিমিটেড";
  const companyAddressEn = settings?.company_address_en || "1/A, D.I.T Extention Road, Alauddin Bhaban (3rd Floor), Fakirapool, Motijheel, Dhaka-1000";
  const companyPhoneEn = settings?.company_phone_en || "Phone: 01618888911, 01841775991, 01770044337, email: besthealth.bhdl@gmail.com";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    if (year && month && day) {
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  const getExpiryDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + 3);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calculateAge = (dobStr?: string, explicitAge?: any) => {
    if (explicitAge !== undefined && explicitAge !== null && String(explicitAge).trim() !== "") {
      const parsedExplicit = parseInt(String(explicitAge), 10);
      return !isNaN(parsedExplicit) ? `${parsedExplicit} Yrs` : String(explicitAge);
    }

    const rawDob = dobStr || patient?.dob || patient?.date_of_birth || patient?.birth_date || patient?.age;
    if (!rawDob || String(rawDob).trim() === "") return "N/A";
    const str = String(rawDob).trim();

    // Handle number inputs like "25" or "25 Yrs" or "25 Years"
    const numberOnlyMatch = str.match(/^(\d{1,3})\s*(yrs?|years?|y)?$/i);
    if (numberOnlyMatch) {
      return `${numberOnlyMatch[1]} Yrs`;
    }

    let birthDate: Date | null = null;

    // Try DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      birthDate = new Date(year, month, day);
    } else {
      // Try YYYY-MM-DD or YYYY/MM/DD
      const yyyymmdd = str.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
      if (yyyymmdd) {
        const year = parseInt(yyyymmdd[1], 10);
        const month = parseInt(yyyymmdd[2], 10) - 1;
        const day = parseInt(yyyymmdd[3], 10);
        birthDate = new Date(year, month, day);
      } else {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          birthDate = parsed;
        }
      }
    }

    if (!birthDate || isNaN(birthDate.getTime())) return str;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} Yrs` : str;
  };

  const qrCodeUrl = typeof window !== "undefined"
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/search-passport?PassportNo=${patient?.passport_no || patient?.pax_id}`)}`
    : "";

  const getValue = (formVal?: string, dbVal?: string, fallback: string = "") => {
    if (formVal !== undefined && formVal !== null && formVal !== "") return formVal;
    if (dbVal !== undefined && dbVal !== null && dbVal !== "") return dbVal;
    return fallback;
  };

  const renderResultText = (val?: string) => {
    if (!val) return val;
    const str = String(val).trim();
    const lower = str.toLowerCase();
    // "Non-Reactive" / "Non Reactive" contain "reactive" as a substring but are
    // a negative (normal) result, not a positive one, so they must stay black.
    const isNegativeQualifier = lower.startsWith("non") || lower.includes("negative");
    const isAbnormal =
      !isNegativeQualifier &&
      (lower.includes("positive") || lower.includes("reactive") || lower === "present");
    if (isAbnormal) {
      return <span style={{ color: "#dc2626", fontWeight: "bold" }}>{str}</span>;
    }
    return str;
  };

  // Common cell styles
  const cellBorder = "1px solid black";
  const cellPad = "2px 4px";
  const fs85 = "11px";
  const fs9 = "13px";
  const fs10 = "10px";

  const heightVal = getValue(formValues?.height, mr.height, "");
  const weightVal = formValues?.weight ? `${formValues.weight} KG` : (mr.weight ? `${mr.weight} KG` : "");
  const heartVal = getValue(formValues?.heart, mr.heart, "");
  const bpVal = getValue(formValues?.bp, mr.bp, "");
  const liverVal = getValue(formValues?.liver, mr.liver, "NORMAL");
  const spleenVal = getValue(formValues?.spleen, mr.spleen, "NORMAL");
  const eyeLeftVal = getValue(formValues?.eyeLeft, mr.eye_left, "6/6");
  const eyeRightVal = getValue(formValues?.eyeRight, mr.eye_right, "6/6");
  const earLeftVal = getValue(formValues?.earLeft, mr.ear_left, "NAD");
  const earRightVal = getValue(formValues?.earRight, mr.ear_right, "NAD");
  const herniaVal = getValue(formValues?.hernia, mr.hernia, "ABSENT");
  const skinVal = getValue(formValues?.skin, mr.skin, "CLEAR");
  const deformitiesVal = getValue(formValues?.deformities, mr.deformities, "NOT FOUND");

  const varicoseVeinsVal = getValue(formValues?.varicoseVeins, mr.varicose_veins, "N/A");
  const psychiatryVal = getValue(formValues?.psychiatry, mr.psychiatry, "N/A");
  const dopThcVal = getValue(formValues?.dopThc, mr.dop_thc, "N/A");
  const dopOpiVal = getValue(formValues?.dopOpi, mr.dop_opi, "N/A");
  const dopAmpVal = getValue(formValues?.dopAmp, mr.dop_amp, "N/A");

  const hemogloVal = getValue(formValues?.hemoglo, mr.hemoglo, "");
  const esrVal = getValue(formValues?.esr, mr.esr, "");
  const rbsVal = getValue(formValues?.rbs, mr.rbs, "");
  const plateletsVal = getValue(formValues?.platelets, mr.platelets, "");
  const wbcVal = getValue(formValues?.wbc, mr.wbc, "");
  const neutrophilsVal = getValue(formValues?.neutrophils, mr.neutrophils, "");
  const lymphocytesVal = getValue(formValues?.lymphocytes, mr.lymphocytes, "");
  const eosinophilsVal = getValue(formValues?.eosinophils, mr.eosinophils, "");
  const monocytesVal = getValue(formValues?.monocytes, mr.monocytes, "");
  const basophilsVal = getValue(formValues?.basophils, mr.basophils, "");
  const bldGroupVal = getValue(formValues?.bldGroup, mr.bld_group, "N/A");
  const ecgVal = getValue(formValues?.ecg, mr.ecg, "N/A");

  const sugerVal = getValue(formValues?.suger, mr.suger, "");
  const albuminVal = getValue(formValues?.albumin, mr.albumin, "");
  const pregnancyVal = getValue(formValues?.pregnancy, mr.pregnancy, "N/A");
  const sBiliVal = getValue(formValues?.sBili, mr.s_bili, "");
  const sgptVal = getValue(formValues?.sgpt, mr.sgpt, "");
  const sgotVal = getValue(formValues?.sgot, mr.sgot, "");
  const sCreatiVal = getValue(formValues?.sCreati, mr.s_creati, "");
  const lipidProfileTgVal = getValue(formValues?.lipidProfileTg, mr.lipid_profile_tg, "");
  const tshVal = getValue(formValues?.tsh, mr.tsh, "");
  const totalT4Val = getValue(formValues?.totalT4, mr.total_t4, "");

  const hivVal = getValue(formValues?.hiv, mr.hiv, "N/A");
  const hbsagVal = getValue(formValues?.hbsag, mr.hbsag, "N/A");
  const hcvVal = getValue(formValues?.hcv, mr.hcv, "N/A");
  const tphaVal = getValue(formValues?.tpha, mr.tpha, "N/A");
  const vdrlVal = getValue(formValues?.vdrl, mr.vdrl, "N/A");

  const commentsVal = getValue(formValues?.comments, mr.comments, "N/A");
  const finalStatusVal = getValue(formValues?.finalStatus, mr.final_status, "Pending");

  return (
    <div
      className="w-full flex justify-center items-start overflow-visible print:overflow-visible print:block"
      style={{
        height: scale < 1 ? `${1220 * scale}px` : "auto",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 0 !important;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
          }
          header, aside, sidebar, nav, .no-print, [data-sidebar="sidebar"], button, input, label {
            display: none !important;
          }
          .print-container, .print-container * {
            visibility: visible !important;
          }
          .hide-on-print-toggle, .hide-on-print-toggle * {
            visibility: hidden !important;
            display: none !important;
          }
          .print-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            border: none !important;
            padding: 2mm 8mm 2mm 8mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            transform: none !important;
            background-color: #ffffff !important;
            z-index: 999999 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
        }
      `}</style>
      <div
        style={{
          width: scale < 1 ? `${794 * scale}px` : "794px",
          height: scale < 1 ? `${1220 * scale}px` : "auto",
          position: scale < 1 ? "relative" : "static",
          overflow: "visible",
        }}
        className="print:w-auto print:h-auto print:static print:visible"
      >
        {/* Main Report Container */}
        <div
          ref={containerRef}
          className="print-container relative print:overflow-hidden shrink-0"
          style={{
            width: "794px",
            minHeight: "1122px",
            height: "auto",
            border: "none",
            backgroundColor: "#ffffff",
            padding: "0 28px 0 28px",
            boxSizing: "border-box",
            fontFamily: "Arial, Helvetica, 'Nirmala UI', Vrinda, 'Noto Sans Bengali', sans-serif",
            color: "#000000",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: scale < 1 ? "absolute" : "relative",
            left: scale < 1 ? "50%" : "auto",
            top: scale < 1 ? "0" : "auto",
            transform: scale < 1 ? `translate(-50%, 0) scale(${scale})` : "none",
            transformOrigin: "top center",
            zIndex: 1,
          }}
        >
          {/* Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none opacity-[0.12] print:opacity-[0.12]">
            <img src={logoSrc} style={{ width: "600px", height: "auto", objectFit: "contain" }} alt="Watermark" />
          </div>

          <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", flex: 1, justifyContent: "flex-start", height: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "flex-start", height: "100%" }}>
              {/* Header Box - Full width edge-to-edge */}
              <div
                style={{
                  minHeight: "auto",
                  marginBottom: "0px",
                  position: "relative",
                  marginTop: "0px",
                  marginLeft: "-28px",
                  marginRight: "-28px",
                  width: "calc(100% + 56px)",
                  overflow: "hidden",
                }}
              >
                <div>
                  {settings?.report_header_image_path ? (
                    <img
                      src={settings.report_header_image_path}
                      alt="Report Header"
                      style={{ width: "100%", height: "auto", display: "block", marginTop: "0px" }}
                    />
                  ) : (
                    <div style={{ padding: "0px 28px 0 28px" }}>
                      {/* Top Slanted Ribbon */}
                      <div className="absolute top-0 right-0 flex h-4 w-48 overflow-hidden select-none pointer-events-none z-20" style={{ transform: "skewX(-35deg) translate(30px, 0)" }}>
                        <div className="flex-1 bg-[#16a34a]" />
                        <div className="w-1.5 bg-white" />
                        <div className="w-4 bg-[#dc2626]" />
                        <div className="w-1.5 bg-white" />
                        <div className="w-8 bg-[#16a34a]" />
                      </div>

                      {/* Report Header Logo & Title */}
                      <div className="flex items-center gap-4 pb-1 mb-1 relative z-10">
                        <img src={logoSrc} className="h-12 w-auto object-contain shrink-0" alt="Best Logo" />
                        <div className="flex-1 text-left">
                          <h1 className="text-[20px] font-black text-red-600 leading-none tracking-tight font-display" style={{ margin: 0, padding: 0 }}>{companyNameEn}</h1>
                          <h2 className="text-[16px] font-bold text-[#16a34a] leading-none font-bengali mt-1" style={{ margin: 0, padding: 0 }}>{companyNameBn}</h2>
                        </div>
                      </div>

                      {/* Header Underline with Red Dot */}
                      <div className="w-full border-b-[2px] border-[#16a34a] relative mb-1 z-10">
                        <div className="absolute right-4 -top-[3px] h-1.5 w-1.5 rounded-full bg-red-600" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
              {/* Medical Report Title */}
              <div style={{ fontSize: "20px", fontWeight: "bold", textAlign: "center", marginTop: "-3px", marginBottom: "1px", color: "#000000" }}>
                Medical Report
              </div>

              {/* Patient Details Meta Table + Image */}
              <div style={{ display: "flex", gap: "4px", width: "100%", marginBottom: "2px", alignItems: "stretch" }}>
                <div style={{ flex: 1 }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "2px", margin: 0 }}>
                    <colgroup>
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "24%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "16%" }} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", backgroundColor: "#ffffff" }}>SL No :</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", textAlign: "center" }}>{patient?.pax_id}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", backgroundColor: "#ffffff" }}>Examined :</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, textAlign: "center" }}>{formatDate(patient?.date)}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", backgroundColor: "#ffffff" }}>Expired :</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", textAlign: "center" }}>{getExpiryDate(patient?.date)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", backgroundColor: "#ffffff" }}>Name :</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", textAlign: "center", textTransform: "uppercase" }} colSpan={2}>{patient?.first_name} {patient?.last_name || ""}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, textAlign: "center" }}><span style={{ fontWeight: "bold" }}>Age:</span> {calculateAge(patient?.dob, patient?.age)}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", backgroundColor: "#ffffff" }}>Nationality :</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", textAlign: "center" }}>{patient?.nationality || "Bangladeshi"}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", backgroundColor: "#ffffff" }}>F/H Name :</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", textAlign: "center", textTransform: "uppercase" }} colSpan={2}>{patient?.father_name || "N/A"}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, textAlign: "center" }}><span style={{ fontWeight: "bold" }}>Sex:</span> {patient?.sex || "N/A"}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", backgroundColor: "#ffffff" }}>Passport No :</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", textAlign: "center" }}>{patient?.passport_no || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", backgroundColor: "#ffffff" }}>Traveling To :</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", textAlign: "center", textTransform: "uppercase" }}>{patient?.country?.name || "N/A"}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", backgroundColor: "#ffffff" }}>Agency :</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs9, fontWeight: "bold", textAlign: "center", textTransform: "uppercase" }} colSpan={3}>{patient?.agency?.name || "N/A"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ width: "80px", flexShrink: 0, border: cellBorder, backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", margin: "2px 0", boxSizing: "border-box", overflow: "hidden" }}>
                  {patient?.image_url ? (
                    <img src={patient.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Patient Photo" />
                  ) : (
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: "#000000" }}>IMAGE</span>
                  )}
                </div>
              </div>
              </div>

              {/* Two-Column Grid: Physical/Medical Exam vs Lab Investigation */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "0px" }}>
                {/* Left Column */}
                <div style={{ width: "49%" }}>
                  {/* 1. Physical Examination */}
                  <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "4px" }}>
                    <colgroup>
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "28%" }} />
                      <col style={{ width: "28%" }} />
                      <col style={{ width: "22%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ backgroundColor: "#eeeeee", border: cellBorder, padding: "2px", textAlign: "center", fontSize: fs9, fontWeight: "bold" }} colSpan={4}>PHYSICAL EXAMINATION</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>HEIGHT</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }}>{heightVal}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>WEIGHT</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }}>{weightVal}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>HEART</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }}>{heartVal}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>B.P.</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }}>{bpVal}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>LIVER</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }}>{liverVal}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>SPLEEN</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }}>{spleenVal}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>LEFT EYE</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", fontWeight: "bold", whiteSpace: "nowrap" }}>{eyeLeftVal}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>RIGHT EYE</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", fontWeight: "bold", whiteSpace: "nowrap" }}>{eyeRightVal}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>LEFT EAR</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }}>{earLeftVal}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>RIGHT EAR</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }}>{earRightVal}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>HERNIA</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }}>{herniaVal}</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>SKIN</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }}>{skinVal}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", whiteSpace: "nowrap" }}>DEFORMITIES :</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", whiteSpace: "nowrap" }} colSpan={3}>{deformitiesVal}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 2. Medical Examination */}
                  <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ backgroundColor: "#eeeeee", border: cellBorder, padding: "3px 2px", textAlign: "center", fontSize: fs9, fontWeight: "bold" }} colSpan={3}>MEDICAL EXAMINATION</th>
                      </tr>
                      <tr>
                        <th style={{ border: cellBorder, padding: "2px 4px", fontSize: fs85, fontWeight: "bold", textAlign: "center", backgroundColor: "#ffffff" }} colSpan={2}>Type of the Examination</th>
                        <th style={{ border: cellBorder, padding: "2px", textAlign: "center", fontSize: fs10, fontWeight: "bold", width: "150px", backgroundColor: "#ffffff" }}>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Others */}
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", textAlign: "center", backgroundColor: "#ffffff", width: "100px" }} rowSpan={2}>OTHERS</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Varicose Veins</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: "bold", textAlign: "center" }}>{renderResultText(varicoseVeinsVal)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Psychiatry</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: "bold", textAlign: "center" }}>{renderResultText(psychiatryVal)}</td>
                      </tr>

                      {/* Drug Test */}
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", textAlign: "center", backgroundColor: "#ffffff" }} rowSpan={3}>DRUG TEST</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>DOP-THC</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: "bold", textAlign: "center" }}>{renderResultText(dopThcVal)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>DOP-OPI</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: "bold", textAlign: "center" }}>{renderResultText(dopOpiVal)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>DOP-AMP</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: "bold", textAlign: "center" }}>{renderResultText(dopAmpVal)}</td>
                      </tr>

                      {/* Full Blood Count */}
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", textAlign: "center", backgroundColor: "#ffffff" }} rowSpan={11}>FULL BLOOD COUNT</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Hemoglobin</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontSize: fs10, fontWeight: "bold" }}>{hemogloVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>11.4 g/dl</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>ESR</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontSize: fs10, fontWeight: "bold" }}>{esrVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>&lt;30mm 1<sup>st</sup> hr</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>RBC</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontSize: fs10, fontWeight: "bold" }}>{rbsVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>4.5-5.5</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Platelets</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontSize: fs10, fontWeight: "bold" }}>{plateletsVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>150-400</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>WBC</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontSize: fs10, fontWeight: "bold" }}>{wbcVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>4.0-11.0</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Neutrophils</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontSize: fs10, fontWeight: "bold" }}>{neutrophilsVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>40-75%</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Lymphocytes</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontSize: fs10, fontWeight: "bold" }}>{lymphocytesVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>20-40%</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Eosinophils</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontSize: fs10, fontWeight: "bold" }}>{eosinophilsVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>02-08%</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Monocytes</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontSize: fs10, fontWeight: "bold" }}>{monocytesVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>01-07%</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Basophils</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontSize: fs10, fontWeight: "bold" }}>{basophilsVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>&lt;01%</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Blood Group</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, textAlign: "center", fontWeight: "bold" }}>{bldGroupVal}</td>
                      </tr>

                      {/* ECG */}
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", backgroundColor: "#ffffff" }} colSpan={2}>ELECTRO CARDIOGRAPH (ECG)</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs10, fontWeight: "bold", textAlign: "center" }}>{ecgVal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right Column */}
                <div style={{ width: "51%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  {/* 1. Laboratory Investigation */}
                  <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "4px" }}>
                    <colgroup>
                      <col style={{ width: "26%" }} />
                      <col style={{ width: "32%" }} />
                      <col style={{ width: "42%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ backgroundColor: "#eeeeee", border: cellBorder, padding: "3px 2px", textAlign: "center", fontSize: fs9, fontWeight: "bold" }} colSpan={3}>Laboratory Investigation</th>
                      </tr>
                      <tr>
                        <th style={{ border: cellBorder, padding: "2px 4px", fontSize: fs85, fontWeight: "bold", textAlign: "center", backgroundColor: "#ffffff" }} colSpan={2}>Type of the Examination</th>
                        <th style={{ border: cellBorder, padding: "2px", textAlign: "center", fontSize: fs85, fontWeight: "bold", backgroundColor: "#ffffff" }}>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Urine R/M/E */}
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", textAlign: "center", backgroundColor: "#ffffff" }} rowSpan={3}>URINE R/M/E</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>Sugar</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontWeight: "bold" }}>{sugerVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>Nill</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Albumin</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontWeight: "bold" }}>{albuminVal}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>&lt;20</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>Pregnancy</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center" }}>{renderResultText(pregnancyVal)}</td>
                      </tr>

                      {/* Blood Biochemistry */}
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", textAlign: "center", backgroundColor: "#ffffff" }} rowSpan={8}>BLOOD-<br />BIOCHEMISTRY</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85 }}>R.B.S</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontWeight: "bold" }}>{renderResultText(rbsVal)}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>&lt;7.5 mmol/L</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>S. Bilirubin</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontWeight: "bold" }}>{renderResultText(sBiliVal)}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>&lt;1.2 mg/dl</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>SGPT</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontWeight: "bold" }}>{renderResultText(sgptVal)}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>&lt;45 U/L</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>SGOT</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontWeight: "bold" }}>{renderResultText(sgotVal)}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>&lt;35 U/L</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>S. Creatinine</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontWeight: "bold" }}>{renderResultText(sCreatiVal)}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>&lt;1.4 mg/dl</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>Lipid Profile</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontWeight: "bold" }}>{renderResultText(lipidProfileTgVal)}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>&lt;150 mg/dl</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>TSH</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontWeight: "bold" }}>{renderResultText(tshVal)}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>0.3 - 4.5</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>Total T4</td>
                        <td style={{ border: cellBorder, padding: "0", fontSize: fs85 }}>
                          <div style={{ display: "flex", width: "100%", height: "100%" }}>
                            <div style={{ flex: 1, padding: cellPad, textAlign: "center", fontWeight: "bold" }}>{renderResultText(totalT4Val)}</div>
                            <div style={{ width: "85px", padding: cellPad, textAlign: "right", fontSize: "10px" }}>3.2 - 12.6</div>
                          </div>
                        </td>
                      </tr>

                      {/* Serology */}
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", textAlign: "center", backgroundColor: "#ffffff" }} rowSpan={5}>BLOOD-ELISA &<br />SEROLOGY</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>HIV I & HIV II</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", fontWeight: "bold" }}>{renderResultText(hivVal)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>HBsAg</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", fontWeight: "bold" }}>{renderResultText(hbsagVal)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>Anti HCV</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", fontWeight: "bold" }}>{renderResultText(hcvVal)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>TPHA</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", fontWeight: "bold" }}>{renderResultText(tphaVal)}</td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, whiteSpace: "nowrap" }}>VDRL</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", fontWeight: "bold" }}>{renderResultText(vdrlVal)}</td>
                      </tr>

                      {/* X-Ray Investigation */}
                      <tr>
                        <td rowSpan={2} style={{ border: cellBorder, padding: cellPad, fontSize: fs85, fontWeight: "bold", textAlign: "center", backgroundColor: "#ffffff" }}>X-RAY<br />INVESTIGATION</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, height: "40px", verticalAlign: "middle", whiteSpace: "nowrap" }}>Chest X-Ray</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", height: "40px", verticalAlign: "middle" }}>
                          <div style={{ height: "40px", maxHeight: "40px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", textOverflow: "ellipsis", lineHeight: "1.15", wordBreak: "break-word" }}>
                            {xray?.findings || "Normal"}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, height: "24px", verticalAlign: "middle" }}>Remarks</td>
                        <td style={{ border: cellBorder, padding: cellPad, fontSize: fs85, textAlign: "center", height: "24px", verticalAlign: "middle" }}>
                          <div style={{ height: "20px", maxHeight: "20px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", textOverflow: "ellipsis", lineHeight: "1.15", wordBreak: "break-word" }}>
                            {xray?.remark || "N/A"}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* X-Ray box, Fingerprint, and Doctor Signature */}
                  <div style={{ height: "150px", width: "100%", padding: "2px 2px", display: "flex", justifyContent: "space-between", alignItems: "center", boxSizing: "border-box", marginTop: "auto", backgroundColor: "#ffffff" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {/* X-RAY Image Box */}
                      <div style={{ width: "140px", height: "150px", border: cellBorder, backgroundColor: "#f8d7da", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", overflow: "hidden", position: "relative" }}>
                        {xray?.image_url ? (
                          <img src={xray.image_url} alt="X-Ray" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>X-RAY</span>
                        )}
                      </div>

                      {/* Fingerprint Circle */}
                      <div style={{ width: "68px", height: "68px", border: cellBorder, borderRadius: "50%", backgroundColor: "#f8d7da", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", position: "relative" }}>
                        {patient?.fingerprint_url ? (
                          <img src={patient.fingerprint_url} alt="Fingerprint" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "8px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", textAlign: "center" }}>FINGERPRINT</span>
                        )}
                      </div>
                    </div>

                    {/* Signature block */}
                    <div style={{ textAlign: "center", width: "155px" }}>
                      <div style={{ height: "45px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "3px" }}>
                        {settings?.signature_physician_path ? (
                          <img src={settings.signature_physician_path} style={{ maxHeight: "45px", maxWidth: "155px", width: "auto", objectFit: "contain" }} alt="Signature" />
                        ) : (
                          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#94a3b8" }}>Physician Sign</span>
                        )}
                      </div>
                      <div style={{ borderTop: "1px dotted black", paddingTop: "2px", width: "100%" }}>
                        <p style={{ fontSize: "8.5px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", margin: "0", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>SIGNATURE OF CHIEF PHYSICIAN</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Remarks / QR code section */}
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", paddingTop: "2px", marginTop: "2px" }}>
                <div style={{ textAlign: "center", width: "55px", flexShrink: 0 }}>
                  <img src={qrCodeUrl} alt="QR Code" crossOrigin="anonymous" style={{ width: "55px", height: "55px", border: "1px solid #000" }} />
                </div>
                <div style={{ flex: 1, fontSize: "12px", lineHeight: "1.25" }}>
                  <div>
                    <strong>Remarks: Medical Report for </strong>
                    <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{patient?.first_name} {patient?.last_name || ""}</span>
                    <strong> is Medically </strong>
                  </div>
                  <div style={{ marginTop: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong style={{ fontSize: "12px" }}>Info:</strong>
                    <span
                      style={{
                        backgroundColor: (finalStatusVal || "UNFIT").toUpperCase() === "FIT" ? "#16a34a" : "#dc2626",
                        color: "#ffffff",
                        fontWeight: "bold",
                        padding: "2px 8px",
                        fontSize: "14px",
                        display: "inline-block",
                      }}
                    >
                      {(finalStatusVal || "UNFIT").toUpperCase()}
                    </span>
                  </div>
                  <div style={{ marginTop: "2px", fontSize: "12px" }}>
                    <strong>Comment: </strong>
                    <span style={{ fontWeight: "bold"}}>{commentsVal}</span>
                  </div>
                </div>
              </div>

              {/* Footer Bangla Notice & Address */}
              <div style={{ borderTop: "2px solid #16a34a", marginTop: "auto", marginBottom: "0px", paddingTop: "4px", textAlign: "center", transform: "translateY(-10px)" }}>
                <p className="font-bengali" style={{ color: "#000000", fontWeight: "bold", fontSize: "12px", marginTop: "4px", marginBottom: "4px" }}>
                  মেডিকেল রিপোর্ট এর তথ্যটি সঠিক আছে কিনা জানার জন্য আমাদের ওয়েব সাইটে ভিজিট করুন অথবা QR Code স্ক্যান করুন।
                </p>

                <div style={{ marginTop: "1px" }}>
                  {settings?.report_footer_image_path ? (
                    <img
                      src={settings.report_footer_image_path}
                      alt="Report Footer"
                      className="w-full h-auto object-contain mx-auto"
                    />
                  ) : (
                    <div>
                      <p style={{ color: "#16a34a", fontWeight: "bold", fontSize: "10px", textTransform: "uppercase", margin: "0", letterSpacing: "0.5px" }}>
                        {companyAddressEn}
                      </p>
                      <p style={{ color: "#16a34a", fontWeight: "bold", fontSize: "10px", margin: "1px 0 0 0" }}>
                        {companyPhoneEn}
                      </p>
                      <p style={{ color: "#dc2626", fontWeight: "extrabold", fontSize: "11px", margin: "1px 0 0 0", letterSpacing: "0.5px" }}>
                        www.bestdiagnostic.com.bd
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
