<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\User;
use App\Support\ReportStatus;
use Carbon\Carbon;
use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

/**
 * Prepares everything the medical certificate PDF (resources/views/pdf/medical-certificate.blade.php)
 * needs. The values and defaults mirror resources/js/components/medical-report-view.tsx so the
 * server-generated PDF reads the same as the printed report.
 */
class CertificateBuilder
{
    public static function settings(): ?User
    {
        return User::where('role', 'Admin')->first() ?? User::first();
    }

    public static function verdict(Patient $patient): string
    {
        $mr = $patient->medicalReport;
        $xray = $patient->xrayReport;

        return ReportStatus::combine($mr?->final_status ?? 'Pending', $xray?->result);
    }

    public static function parseDate(?string $value): ?Carbon
    {
        if (!$value || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse(trim($value));
        } catch (\Throwable $e) {
            return null;
        }
    }

    public static function expiryDate(?string $date): ?Carbon
    {
        $exam = self::parseDate($date);

        return $exam ? $exam->copy()->addMonths((int) config('certificate.validity_months', 3)) : null;
    }

    public static function formatDate(?string $value): string
    {
        $d = self::parseDate($value);

        return $d ? $d->format('d-m-Y') : (string) $value;
    }

    public static function age(?string $dob): string
    {
        $raw = trim((string) $dob);
        if ($raw === '') {
            return 'N/A';
        }

        if (preg_match('/^(\d{1,3})\s*(yrs?|years?|y)?$/i', $raw, $m)) {
            return ((int) $m[1]) . ' Yrs';
        }

        if (preg_match('/^(\d{1,2})[-\/. ](\d{1,2})[-\/. ](\d{4})$/', $raw, $m)) {
            try {
                $birth = Carbon::create((int) $m[3], (int) $m[2], (int) $m[1]);
            } catch (\Throwable $e) {
                $birth = null;
            }
        } else {
            $birth = self::parseDate($raw);
        }

        if (!$birth || $birth->isFuture()) {
            return $raw;
        }

        return ((int) floor($birth->diffInYears(now()))) . ' Yrs';
    }

    /**
     * Red/bold in the report for positive-type results (but "Non-Reactive"/"Negative" stay black).
     */
    public static function isAbnormalResult(?string $value): bool
    {
        $v = strtolower(trim((string) $value));
        if ($v === '') {
            return false;
        }
        if (str_starts_with($v, 'non') || str_contains($v, 'negative')) {
            return false;
        }

        return str_contains($v, 'positive') || str_contains($v, 'reactive') || $v === 'present';
    }

    /**
     * Read a file that lives under /public and return it as a data: URI so the PDF never has to
     * make network requests. Anything outside public/ (or missing) yields null.
     */
    public static function imageDataUri(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $relative = parse_url($path, PHP_URL_PATH) ?: $path;
        $publicRoot = realpath(public_path());
        $full = realpath(public_path(ltrim($relative, '/\\')));

        if (!$publicRoot || !$full || !str_starts_with($full, $publicRoot) || !is_file($full)) {
            return null;
        }

        $mime = match (strtolower(pathinfo($full, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            default => null, // svg/webp/bmp etc. are not reliably supported by dompdf
        };
        if (!$mime) {
            return null;
        }

        return 'data:' . $mime . ';base64,' . base64_encode((string) file_get_contents($full));
    }

    public static function qrDataUri(string $data): ?string
    {
        try {
            $options = new QROptions([
                'outputInterface' => QRGdImagePNG::class,
                'outputBase64'    => true,
                'eccLevel'        => EccLevel::M,
                'scale'           => 6,
            ]);

            return (new QRCode($options))->render($data);
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    public static function build(Patient $patient): array
    {
        $patient->loadMissing(['country', 'agency', 'medicalReport', 'xrayReport']);
        $settings = self::settings();
        $mr = $patient->medicalReport;
        $xray = $patient->xrayReport;

        $get = function (string $field, string $fallback = '') use ($mr): string {
            $v = $mr?->{$field};

            return ($v !== null && $v !== '') ? (string) $v : $fallback;
        };

        $baseUrl = rtrim((string) config('app.url'), '/');
        $verifyKey = $patient->passport_no ?: $patient->pax_id;
        $verdict = self::verdict($patient);
        $expiry = self::expiryDate($patient->date);

        return [
            'company' => [
                'name_en'    => $settings?->company_name_en ?: 'BEST HEALTH DIAGNOSTIC LTD.',
                'address_en' => $settings?->company_address_en ?: '',
                'phone_en'   => $settings?->company_phone_en ?: '',
            ],
            'images' => [
                'header'      => self::imageDataUri($settings?->report_header_image_path),
                'footer'      => self::imageDataUri($settings?->report_footer_image_path),
                'logo'        => self::imageDataUri($settings?->logo_path) ?? self::imageDataUri('/assets/images/best-logo.png'),
                'signature'   => self::imageDataUri($settings?->signature_physician_path),
                'photo'       => self::imageDataUri($patient->image_path),
                'fingerprint' => self::imageDataUri($patient->fingerprint_path),
                'xray'        => self::imageDataUri($xray?->image_path),
                'qr'          => self::qrDataUri($baseUrl . '/search-passport?PassportNo=' . urlencode((string) $verifyKey)),
            ],
            'patient' => [
                'pax_id'      => $patient->pax_id,
                'name'        => trim($patient->first_name . ' ' . ($patient->last_name ?? '')),
                'father_name' => $patient->father_name ?: 'N/A',
                'exam_date'   => self::formatDate($patient->date),
                'expiry_date' => $expiry ? $expiry->format('d-m-Y') : '',
                'age'         => self::age($patient->dob),
                'sex'         => $patient->sex ?: 'N/A',
                'nationality' => $patient->nationality ?: 'Bangladeshi',
                'passport_no' => $patient->passport_no ?: 'N/A',
                'country'     => $patient->country?->name ?: 'N/A',
                'agency'      => $patient->agency?->name ?: 'N/A',
            ],
            'exam' => [
                'height'           => $get('height'),
                'weight'           => $get('weight') !== '' ? $get('weight') . ' KG' : '',
                'heart'            => $get('heart'),
                'bp'               => $get('bp'),
                'liver'            => $get('liver', 'NORMAL'),
                'spleen'           => $get('spleen', 'NORMAL'),
                'eye_left'         => $get('eye_left', '6/6'),
                'eye_right'        => $get('eye_right', '6/6'),
                'ear_left'         => $get('ear_left', 'NAD'),
                'ear_right'        => $get('ear_right', 'NAD'),
                'hernia'           => $get('hernia', 'ABSENT'),
                'skin'             => $get('skin', 'CLEAR'),
                'deformities'      => $get('deformities', 'NOT FOUND'),
                'varicose_veins'   => $get('varicose_veins', 'N/A'),
                'psychiatry'       => $get('psychiatry', 'N/A'),
                'dop_thc'          => $get('dop_thc', 'N/A'),
                'dop_opi'          => $get('dop_opi', 'N/A'),
                'dop_amp'          => $get('dop_amp', 'N/A'),
                'hemoglo'          => $get('hemoglo'),
                'esr'              => $get('esr'),
                'rbc'              => $get('rbc'),
                'platelets'        => $get('platelets'),
                'wbc'              => $get('wbc'),
                'neutrophils'      => $get('neutrophils'),
                'lymphocytes'      => $get('lymphocytes'),
                'eosinophils'      => $get('eosinophils'),
                'monocytes'        => $get('monocytes'),
                'basophils'        => $get('basophils'),
                'bld_group'        => $get('bld_group', 'N/A'),
                'ecg'              => $get('ecg', 'N/A'),
                'suger'            => $get('suger'),
                'albumin'          => $get('albumin'),
                'pregnancy'        => $get('pregnancy', 'N/A'),
                'rbs'              => $get('rbs'),
                's_bili'           => $get('s_bili'),
                'sgpt'             => $get('sgpt'),
                'sgot'             => $get('sgot'),
                's_creati'         => $get('s_creati'),
                'lipid_profile_tg' => $get('lipid_profile_tg'),
                'tsh'              => $get('tsh'),
                'total_t4'         => $get('total_t4'),
                'hiv'              => $get('hiv', 'N/A'),
                'hbsag'            => $get('hbsag', 'N/A'),
                'hcv'              => $get('hcv', 'N/A'),
                'tpha'             => $get('tpha', 'N/A'),
                'vdrl'             => $get('vdrl', 'N/A'),
                'comments'         => $get('comments', 'N/A'),
            ],
            'xray' => [
                'findings' => $xray?->findings ?: 'Normal',
                'remark'   => $xray?->remark ?: 'N/A',
            ],
            'verdict'       => strtoupper($verdict),
            'verdict_color' => match ($verdict) {
                ReportStatus::FIT => '#16a34a',
                ReportStatus::UNFIT => '#dc2626',
                default => '#d97706',
            },
        ];
    }
}
