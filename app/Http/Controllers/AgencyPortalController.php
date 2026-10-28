<?php

namespace App\Http\Controllers;

use App\Models\MedicalReport;
use App\Models\Patient;
use App\Models\XrayReport;
use App\Traits\StoresPublicUploads;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Agency Portal: a trimmed-down version of the staff Entry Form for agencies to submit a patient
 * themselves. Deliberately leaves out fingerprint capture, all fee/billing fields, and the MR
 * picker — office staff fill those in later from the normal (staff) Entry Form / Database, same
 * as any other entry. agency_id is always the logged-in agency, never trusted from the request.
 */
class AgencyPortalController extends Controller
{
    use StoresPublicUploads;

    /**
     * POST /api/agency/patients
     */
    public function store(Request $request)
    {
        $agency = Auth::guard('agency')->user();

        $validator = Validator::make($request->all(), [
            'date' => 'nullable|string',
            'country_id' => 'required|exists:countries,id',
            'nationality' => 'nullable|string',
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'father_name' => 'nullable|string',
            'mother_name' => 'nullable|string',
            'mobile_no' => 'nullable|string',
            'dob' => 'nullable|string',
            'sex' => 'nullable|string',
            'passport_no' => 'nullable|string',
            'visa_no' => 'nullable|string',
            'issue_date' => 'nullable|string',
            'job_applied' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ], [], [
            'country_id' => 'country',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $this->storePublicUpload($request->file('image'), 'patients', 'photo');
        }

        DB::beginTransaction();
        try {
            // Same atomic PAX ID generation as PatientController::store().
            $maxId = Patient::lockForUpdate()->max('id') ?? 0;
            $paxId = 'BEST' . str_pad($maxId + 1, 6, '0', STR_PAD_LEFT);

            $patient = Patient::create(array_merge(
                $validator->validated(),
                [
                    'pax_id'      => $paxId,
                    'agency_id'   => $agency->id,
                    'image_path'  => $imagePath,
                    'date'        => $request->date ?? date('Y-m-d'),
                    // Fee/billing left at their column defaults (0) — office fills these in when
                    // they review the entry. created_by stays null: no staff user created this.
                ]
            ));

            MedicalReport::create([
                'patient_id'   => $patient->id,
                'final_status' => 'Fit',
                'is_online'    => 'No',
                'hbsag'        => 'N/A',
                'hcv'          => 'N/A',
                'tpha'         => 'N/A',
                'pregnancy'    => 'N/A',
                'malaria'      => 'N/A',
                'hiv'          => 'N/A',
            ]);

            XrayReport::create([
                'patient_id' => $patient->id,
                'date'       => $request->date ?? date('Y-m-d'),
                'result'     => 'Pending',
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Entry submitted. Our office will review and complete it shortly.',
                'data'    => Patient::with(['country', 'mr'])->find($patient->id),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to submit entry: ' . $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/agency/patients/{pax_id} (method-spoofed PUT) — edit one of this agency's own
     * entries. Same field set as store(): no fingerprint, MR, or fee/billing. 404s (not 403)
     * outside the agency's own records, same reasoning as show().
     */
    public function update(Request $request, string $paxId)
    {
        $agency = Auth::guard('agency')->user();

        $patient = Patient::where('agency_id', $agency->id)->where('pax_id', $paxId)->first();
        if (! $patient) {
            return response()->json(['error' => 'Entry not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'date' => 'nullable|string',
            'country_id' => 'required|exists:countries,id',
            'nationality' => 'nullable|string',
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'father_name' => 'nullable|string',
            'mother_name' => 'nullable|string',
            'mobile_no' => 'nullable|string',
            'dob' => 'nullable|string',
            'sex' => 'nullable|string',
            'passport_no' => 'nullable|string',
            'visa_no' => 'nullable|string',
            'issue_date' => 'nullable|string',
            'job_applied' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ], [], [
            'country_id' => 'country',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $updates = $validator->validated();
        unset($updates['image']);

        if ($request->hasFile('image')) {
            $updates['image_path'] = $this->storePublicUpload($request->file('image'), 'patients', 'photo');
        }

        $patient->update($updates);

        return response()->json([
            'message' => 'Entry updated successfully.',
            'data'    => Patient::with(['country', 'mr'])->find($patient->id),
        ]);
    }

    /**
     * GET /api/agency/patients — this agency's own entries only, newest first.
     *
     * Supports the same from_date/to_date/status filters the staff Database/Reports pages use.
     * Omitting per_page returns the full matching list unpaginated (used by the Reports page,
     * which needs every matching row at once for its totals and PDF/CSV export) — mirrors
     * PatientController::index()'s own "no per_page means everything" convention.
     */
    public function index(Request $request)
    {
        $agency = Auth::guard('agency')->user();

        $query = Patient::with(['country', 'mr', 'medicalReport', 'xrayReport'])
            ->where('agency_id', $agency->id);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('pax_id', 'like', "%{$search}%")
                    ->orWhere('passport_no', 'like', "%{$search}%")
                    ->orWhereRaw("CONCAT(first_name, ' ', COALESCE(last_name, '')) like ?", ["%{$search}%"]);
            });
        }

        if ($request->filled('from_date')) {
            $query->where('date', '>=', $request->query('from_date'));
        }
        if ($request->filled('to_date')) {
            $query->where('date', '<=', $request->query('to_date'));
        }
        if ($request->filled('status')) {
            $query->whereHas('medicalReport', function ($q) use ($request) {
                $q->where('final_status', $request->query('status'));
            });
        }

        $query->orderByDesc('id');

        if (! $request->filled('per_page')) {
            return response()->json($query->get());
        }

        $perPage = (int) min(max((int) $request->query('per_page'), 1), 100);

        return response()->json($query->paginate($perPage));
    }

    /**
     * GET /api/agency/patients/{pax_id} — one own entry, 404s (not 403) outside the agency's
     * own records so it doesn't confirm or deny another agency's pax_id exists.
     */
    public function show(Request $request, string $paxId)
    {
        $agency = Auth::guard('agency')->user();

        $patient = Patient::with(['country', 'mr', 'medicalReport', 'xrayReport'])
            ->where('agency_id', $agency->id)
            ->where('pax_id', $paxId)
            ->first();

        if (! $patient) {
            return response()->json(['error' => 'Entry not found'], 404);
        }

        return response()->json($patient);
    }
}
