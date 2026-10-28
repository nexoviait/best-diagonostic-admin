<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Services\CertificateBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

/**
 * Public, limited-exposure certificate endpoints used by the patient side of the mobile app.
 *
 * Unlike the older public/check-report endpoint (which returns the whole medical record),
 * search() only returns what the verification card needs: name, passport, country, dates and the
 * overall verdict. The full report is only available as a PDF through a short-lived signed link.
 */
class PublicCertificateController extends Controller
{
    /**
     * GET /api/public/certificate/search?passport_no=...&token=...
     *
     * passport_no is required. token (the patient's pax_id / slip number) is an optional extra
     * check: when both are sent, both must match. Token-only lookups are disabled unless
     * PUBLIC_TOKEN_ONLY_SEARCH=true (see config/certificate.php for why).
     */
    public function search(Request $request)
    {
        $passport = trim((string) ($request->query('passport_no') ?? $request->query('PassportNo') ?? $request->query('query') ?? ''));
        $token = trim((string) ($request->query('token') ?? $request->query('pax_id') ?? ''));

        if ($passport === '' && $token === '') {
            return response()->json(['error' => 'Passport No is required'], 422);
        }

        if ($passport === '' && !config('certificate.allow_token_only_search')) {
            return response()->json(['error' => 'Passport No is required'], 422);
        }

        $query = Patient::with(['country', 'medicalReport', 'xrayReport']);
        if ($passport !== '') {
            $query->where('passport_no', $passport);
        }
        if ($token !== '') {
            $query->where('pax_id', $token);
        }

        // A passport can appear on more than one visit; the latest exam is the one that counts.
        $patient = $query->orderByDesc('id')->first();

        // Same message whichever field failed to match, so the response doesn't help guessing.
        if (!$patient) {
            return response()->json(['error' => 'No report found for the details provided'], 404);
        }

        $expiry = CertificateBuilder::expiryDate($patient->date);
        $ttl = (int) config('certificate.pdf_link_ttl_minutes', 30);
        $expiresAt = now()->addMinutes($ttl);

        // Relative signed URL: prepending the host below (rather than baking it into the signed
        // URL itself) means the signature stays valid however the web server sees the scheme/host.
        $signedPath = URL::temporarySignedRoute(
            'public.certificate.pdf',
            $expiresAt,
            ['pax_id' => $patient->pax_id],
            absolute: false,
        );

        // Built from the request actually received, not config('app.url') — that config value is
        // easy to leave stale (e.g. pointed at a different local dev port than the one actually
        // serving this request), which would silently hand the client a dead link.
        $baseUrl = $request->getSchemeAndHttpHost();

        return response()->json([
            'token'         => $patient->pax_id,
            'name'          => trim($patient->first_name . ' ' . ($patient->last_name ?? '')),
            'passport_no'   => $patient->passport_no,
            'country'       => $patient->country?->name,
            'exam_date'     => $patient->date,
            'expiry_date'   => $expiry?->format('Y-m-d'),
            'is_expired'    => $expiry ? $expiry->isPast() : null,
            'status'        => CertificateBuilder::verdict($patient),
            'pdf_url'       => $baseUrl . $signedPath,
            'pdf_expires_at' => $expiresAt->toIso8601String(),
        ]);
    }

    /**
     * GET /api/public/certificate/{pax_id}/pdf  (signed, expiring link from search())
     */
    public function pdf(string $paxId)
    {
        $patient = Patient::with(['country', 'agency', 'medicalReport', 'xrayReport'])
            ->where('pax_id', $paxId)
            ->first();

        if (!$patient) {
            return response()->json(['error' => 'Report not found'], 404);
        }

        $pdf = Pdf::loadView('pdf.medical-certificate', ['data' => CertificateBuilder::build($patient)])
            ->setPaper('a4', 'portrait')
            ->setOption([
                'isRemoteEnabled' => false, // every image is embedded as a data: URI
                'isHtml5ParserEnabled' => true,
                'defaultFont' => 'Helvetica',
                'dpi' => 96,
            ]);

        return $pdf->download('Medical-Certificate-' . preg_replace('/[^A-Za-z0-9_-]/', '', $patient->pax_id) . '.pdf');
    }
}
