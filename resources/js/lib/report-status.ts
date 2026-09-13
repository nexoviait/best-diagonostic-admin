// The certificate's overall verdict ("Info: FIT/UNFIT/HELD UP") must reflect
// the worst finding across the whole exam, not just the Report Entry form's
// own status in isolation — a clean blood/physical exam paired with an
// abnormal X-ray is still an overall UNFIT patient, and a clean exam with an
// X-ray nobody has reviewed yet ("Pending") isn't a clear FIT either.
//
// Priority (worst wins): Unfit > Held up (also covers Pending/N/A/unknown,
// treated the same way for safety — "we don't know yet" should never
// combine into a FIT verdict) > Fit. Both sides have to be Fit for the
// overall result to be Fit.
function statusRank(status?: string | null): 1 | 2 | 3 {
  const v = (status || "").trim().toUpperCase();
  // X-ray results from before this field's options were changed to
  // Fit/Held up/Unfit still say "Normal"/"Abnormal" on older records —
  // treat those the same as Fit/Unfit so old and new records combine
  // consistently.
  if (v === "UNFIT" || v === "ABNORMAL") return 3;
  if (v === "FIT" || v === "NORMAL") return 1;
  return 2; // "HELD UP", "PENDING", "N/A", empty, or anything unrecognized
}

export function combineOverallStatus(
  reportStatus?: string | null,
  xray?: { result?: string | null } | null,
): "Fit" | "Unfit" | "Held up" {
  const reportRank = statusRank(reportStatus);

  // Only let the X-ray affect the verdict when this patient actually has an
  // X-ray report on file — otherwise a patient whose package never included
  // one would get wrongly downgraded to "Held up" by a missing result.
  const hasXray = !!xray && !!xray.result;
  const xrayRank = hasXray ? statusRank(xray!.result) : reportRank;

  const worst = Math.max(reportRank, xrayRank);
  if (worst === 3) return "Unfit";
  if (worst === 1) return "Fit";
  return "Held up";
}
