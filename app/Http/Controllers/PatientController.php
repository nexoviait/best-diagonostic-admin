<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\MedicalReport;
use App\Models\XrayReport;
use App\Models\Country;
use App\Models\Agency;
use App\Models\Mr;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

use App\Models\User;
use App\Traits\StoresPublicUploads;

class PatientController extends Controller
{
    use StoresPublicUploads;


    public function getPublicSettings()
    {
        $admin = User::where('role', 'Admin')->first() ?? User::first();
        if (!$admin) {
            return response()->json(['error' => 'No settings found'], 404);
        }
        return response()->json([
            'company_name_en' => $admin->company_name_en,
            'company_name_en_title' => $admin->company_name_en_title,
            'company_address_en' => $admin->company_address_en,
            'company_phone_en' => $admin->company_phone_en,
            'company_pax_en' => $admin->company_pax_en,
            'company_name_bn' => $admin->company_name_bn,
            'company_name_bn_title' => $admin->company_name_bn_title,
            'company_address_bn' => $admin->company_address_bn,
            'company_phone_bn' => $admin->company_phone_bn,
            'company_pax_bn' => $admin->company_pax_bn,
            'logo_path' => $admin->logo_path,
            'signature_physician_path' => $admin->signature_physician_path,
            'signature_radiologist_path' => $admin->signature_radiologist_path,
            'signature_authorised_path' => $admin->signature_authorised_path,
            'report_header_image_path' => $admin->report_header_image_path,
            'report_footer_image_path' => $admin->report_footer_image_path,
            'payment_edit_window_minutes' => $admin->payment_edit_window_minutes,
        ]);
    }

    public function index(Request $request)
    {
        $query = Patient::with(['country', 'agency', 'mr', 'creator', 'medicalReport', 'xrayReport']);

        // Filter by Pax ID or Passport or Name
        if ($request->has('search_field') && $request->has('search_value')) {
            $field = $request->search_field;
            $val = $request->search_value;

            if (!empty($val)) {
                if ($field === 'pax') {
                    $query->where('pax_id', 'like', '%' . $val . '%');
                } elseif ($field === 'passport') {
                    $query->where('passport_no', 'like', '%' . $val . '%');
                } elseif ($field === 'name') {
                    $query->where(DB::raw("CONCAT(first_name, ' ', COALESCE(last_name, ''))"), 'like', '%' . $val . '%');
                }
            }
        }

        // Filter by date range
        if ($request->filled('from_date')) {
            $query->where('date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->where('date', '<=', $request->to_date);
        }

        // Filter by agency
        if ($request->filled('agency_id')) {
            $query->where('agency_id', $request->agency_id);
        }

        // Filter by MR
        if ($request->filled('mr_id')) {
            $query->where('mr_id', $request->mr_id);
        }

        // Filter by creator (used by the "My Entries" page)
        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        $patients = $query->orderBy('created_at', 'desc')->get();

        return response()->json($patients);
    }

    public function creators()
    {
        $userIds = Patient::whereNotNull('created_by')->distinct()->pluck('created_by');
        $users = User::whereIn('id', $userIds)->orderBy('name')->get(['id', 'name']);

        return response()->json($users);
    }

    public function getPublicReport(Request $request)
    {
        $search = $request->query('PassportNo') ?? $request->query('query');
        if (empty($search)) {
            return response()->json(['error' => 'Passport No or Pax ID is required'], 422);
        }

        $patient = Patient::with(['country', 'agency', 'mr', 'medicalReport', 'xrayReport'])
            ->where('pax_id', $search)
            ->orWhere('passport_no', $search)
            ->first();

        if (!$patient) {
            return response()->json(['error' => 'Patient not found'], 404);
        }

        // SECURITY: Strip financial and internal fields from the public response
        $data = $patient->toArray();
        foreach (['medical_fee', 'received_amount', 'due_amount', 'niddle_charge', 'in_words'] as $field) {
            unset($data[$field]);
        }

        return response()->json($data);
    }

    public function dashboardStats()
    {
        $totalPatients = Patient::count();
        $completedReports = MedicalReport::whereIn('final_status', ['Fit', 'Unfit', 'FIT', 'UNFIT'])->count();
        
        // Count Xray Reports with findings or result
        $xrayUploaded = XrayReport::whereNotNull('findings')->orWhere('result', 'Normal')->count();
        
        // Calculate receivables from patients
        $receivables = Patient::sum('due_amount');

        // Total count of config tables
        $totalCountries = Country::count();
        $totalAgencies = Agency::count();
        $totalMrs = Mr::count();

        // Get 5 most recent patients
        $recentPatients = Patient::with(['country', 'agency', 'medicalReport'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'total_patients' => $totalPatients,
            'completed_reports' => $completedReports,
            'xray_uploaded' => $xrayUploaded,
            'agency_receivables' => $receivables,
            'total_countries' => $totalCountries,
            'total_agencies' => $totalAgencies,
            'total_mrs' => $totalMrs,
            'recent_patients' => $recentPatients
        ]);
    }

    public function store(Request $request)
    {
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
            'agency_id' => 'required|exists:agencies,id',
            'mr_id' => 'required|exists:mrs,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'fingerprint' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'fingerprint_template' => 'nullable|string|max:8000',
            'fingerprint_quality' => 'nullable|integer|min:0|max:100',
            'medical_fee' => 'required|numeric',
            'received_amount' => 'nullable|numeric',
            'due_amount' => 'nullable|numeric',
            'niddle_charge' => 'nullable|numeric',
            'in_words' => 'nullable|string',
        ], [], [
            'country_id' => 'country',
            'agency_id' => 'agency',
            'mr_id' => 'MR',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // Handle Image upload if any
        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $this->storePublicUpload($request->file('image'), 'patients', 'photo');
        }

        // Handle Fingerprint upload if any
        $fingerprintPath = null;
        if ($request->hasFile('fingerprint')) {
            $fingerprintPath = $this->storePublicUpload($request->file('fingerprint'), 'patients/fingerprints', 'fingerprint');
        }

        DB::beginTransaction();
        try {
            // Generate PAX ID atomically — lock ensures no two concurrent requests get the same ID
            $maxId = Patient::lockForUpdate()->max('id') ?? 0;
            $paxId = 'BEST' . str_pad($maxId + 1, 6, '0', STR_PAD_LEFT);

            $received = $request->received_amount ?? 0;
            $fee      = $request->medical_fee;
            $due      = $fee - $received;

            $patient = Patient::create(array_merge(
                $validator->validated(),
                [
                    'pax_id'           => $paxId,
                    'image_path'       => $imagePath,
                    'fingerprint_path' => $fingerprintPath,
                    'received_amount'  => $received,
                    'due_amount'       => $due,
                    'date'             => $request->date ?? date('Y-m-d'),
                    'created_by'       => Auth::guard('api')->id(),
                ]
            ));

            // Auto-create blank Medical Report
            MedicalReport::create([
                'patient_id'   => $patient->id,
                'final_status' => 'Held up',
                'is_online'    => 'No',
            ]);

            // Auto-create blank Xray Report
            XrayReport::create([
                'patient_id' => $patient->id,
                'date'       => $request->date ?? date('Y-m-d'),
                'result'     => 'Pending',
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Patient entry created successfully',
                'data'    => Patient::with(['country', 'agency', 'mr', 'creator'])->find($patient->id),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create patient: ' . $e->getMessage()], 500);
        }
    }

    public function show($pax_id_or_id)
    {
        $patient = Patient::with(['country', 'agency', 'mr', 'creator', 'medicalReport', 'xrayReport'])
            ->where('pax_id', $pax_id_or_id)
            ->orWhere('id', $pax_id_or_id)
            ->first();

        if (!$patient) {
            return response()->json(['error' => 'Patient not found'], 404);
        }

        return response()->json($patient);
    }

    public function update(Request $request, $id)
    {
        $patient = Patient::find($id);
        if (!$patient) {
            return response()->json(['error' => 'Patient not found'], 404);
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
            'agency_id' => 'required|exists:agencies,id',
            'mr_id' => 'required|exists:mrs,id',
            'medical_fee' => 'numeric',
            'received_amount' => 'numeric',
            'niddle_charge' => 'numeric',
            'in_words' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'fingerprint' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'fingerprint_template' => 'nullable|string|max:8000',
            'fingerprint_quality' => 'nullable|integer|min:0|max:100',
        ], [], [
            'country_id' => 'country',
            'agency_id' => 'agency',
            'mr_id' => 'MR',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $validated = $validator->validated();

        // SECURITY: payment fields have their own authorization gate, independent of general
        // patient-edit access — a plain permission check alone isn't enough since a user could
        // otherwise keep editing payment indefinitely, so admins can also cap it to a time window
        // measured from patient creation. Superadmin/Admin always bypass this.
        $paymentChanged = (array_key_exists('medical_fee', $validated) && (float) $validated['medical_fee'] !== (float) $patient->medical_fee)
            || (array_key_exists('received_amount', $validated) && (float) $validated['received_amount'] !== (float) $patient->received_amount)
            || (array_key_exists('niddle_charge', $validated) && (float) $validated['niddle_charge'] !== (float) $patient->niddle_charge)
            || (array_key_exists('in_words', $validated) && (string) $validated['in_words'] !== (string) $patient->in_words);

        if ($paymentChanged) {
            $actor = Auth::guard('api')->user();
            $isSuperadmin = $actor && ($actor->role === 'Admin' || $actor->role_name === 'Superadmin');

            if (!$isSuperadmin) {
                $permissions = $actor ? ($actor->permissions ?? []) : [];
                if (!in_array('edit_payment', $permissions, true)) {
                    return response()->json(['error' => 'You do not have permission to edit payment fields.'], 403);
                }

                $admin = User::where('role', 'Admin')->first();
                $windowMinutes = $admin?->payment_edit_window_minutes;
                if ($windowMinutes !== null && $patient->created_at) {
                    $deadline = $patient->created_at->copy()->addMinutes((int) $windowMinutes);
                    if (now()->greaterThan($deadline)) {
                        return response()->json(['error' => 'The payment edit time limit has expired for this entry.'], 403);
                    }
                }
            }
        }

        // Handle Image upload if any
        if ($request->hasFile('image')) {
            $patient->image_path = $this->storePublicUpload($request->file('image'), 'patients', 'photo');
        }

        // Handle Fingerprint upload if any
        if ($request->hasFile('fingerprint')) {
            $patient->fingerprint_path = $this->storePublicUpload($request->file('fingerprint'), 'patients/fingerprints', 'fingerprint');
        }

        $received = $request->input('received_amount', $patient->received_amount);
        $fee = $request->input('medical_fee', $patient->medical_fee);
        $due = $fee - $received;

        $patient->update(array_merge(
            $validated,
            [
                'due_amount' => $due,
            ]
        ));

        return response()->json([
            'message' => 'Patient updated successfully',
            'data' => Patient::with(['country', 'agency', 'mr', 'creator'])->find($patient->id)
        ]);
    }

    public function destroy($id)
    {
        $patient = Patient::find($id);
        if (!$patient) {
            return response()->json(['error' => 'Patient not found'], 404);
        }

        $patient->delete();
        return response()->json(['message' => 'Patient deleted successfully']);
    }
}
