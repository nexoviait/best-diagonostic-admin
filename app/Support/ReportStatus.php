<?php

namespace App\Support;

/**
 * Overall verdict shown on the medical certificate.
 *
 * Mirrors resources/js/lib/report-status.ts (combineOverallStatus) so the
 * printed report and the server-generated PDF always agree. Keep both in sync.
 *
 * Priority (worst wins): Unfit > Held up > Fit. "Held up" also covers
 * Pending / N/A / empty / anything unrecognised, because "we don't know yet"
 * must never combine into a clean FIT verdict.
 */
class ReportStatus
{
    public const FIT = 'Fit';
    public const UNFIT = 'Unfit';
    public const HELD_UP = 'Held up';

    private static function rank(?string $status): int
    {
        $v = strtoupper(trim((string) $status));

        // Older X-ray records still say Normal/Abnormal instead of Fit/Unfit.
        if ($v === 'UNFIT' || $v === 'ABNORMAL') {
            return 3;
        }
        if ($v === 'FIT' || $v === 'NORMAL') {
            return 1;
        }

        return 2;
    }

    /**
     * @param string|null $reportStatus  medical_reports.final_status
     * @param string|null $xrayResult    xray_reports.result (null when the patient has no X-ray result)
     */
    public static function combine(?string $reportStatus, ?string $xrayResult): string
    {
        $reportRank = self::rank($reportStatus);

        // A patient without an X-ray result must not be downgraded by it.
        $hasXray = $xrayResult !== null && trim($xrayResult) !== '';
        $xrayRank = $hasXray ? self::rank($xrayResult) : $reportRank;

        $worst = max($reportRank, $xrayRank);

        return match ($worst) {
            3 => self::UNFIT,
            1 => self::FIT,
            default => self::HELD_UP,
        };
    }
}
