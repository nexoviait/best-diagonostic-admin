<?php

namespace App\Http\Controllers;

use App\Models\MedicalReport;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MedicalReportController extends Controller
{
    public function show($patient_id_or_pax_id)
    {
        // Try patient_id first, then pax_id
        $patient = Patient::where('id', $patient_id_or_pax_id)
            ->orWhere('pax_id', $patient_id_or_pax_id)
            ->first();

        if (!$patient) {
            return response()->json(['error' => 'Patient not found'], 404);
        }

        $report = MedicalReport::where('patient_id', $patient->id)->first();
        if (!$report) {
            $report = MedicalReport::create([
                'patient_id' => $patient->id,
                'final_status' => 'Held up',
                'is_online' => 'No',
                'hbsag' => 'N/A',
                'hcv' => 'N/A',
                'tpha' => 'N/A',
                'pregnancy' => 'N/A',
                'malaria' => 'N/A',
                'hiv' => 'N/A',
            ]);
        }

        return response()->json($report);
    }

    public function storeOrUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required', // Can be Patient ID or Pax ID
            'bld_group' => 'nullable|string',
            'hiv_antibody' => 'nullable|string',
            'hbsag' => 'nullable|string',
            'hcv' => 'nullable|string',
            'malaria' => 'nullable|string',
            'tpha' => 'nullable|string',
            'tb' => 'nullable|string',
            'filariasis' => 'nullable|string',
            'leishmaniasis' => 'nullable|string',
            'leprosy' => 'nullable|string',
            'free_from_chronic' => 'nullable|string',
            'tumor_cancer' => 'nullable|string',
            'epilepsy' => 'nullable|string',
            'mental_illness' => 'nullable|string',
            'pregnancy' => 'nullable|string',
            'xray' => 'nullable|string',
            'physical' => 'nullable|string',
            'amp' => 'nullable|string',
            'albumin' => 'nullable|string',
            'medical_history' => 'nullable|string',
            'comments' => 'nullable|string',
            'final_status' => 'nullable|string|in:Fit,Unfit,Held up,FIT,UNFIT,HELD UP',
            'is_online' => 'nullable|string|in:Yes,No,YES,NO',
            'height' => 'nullable|string',
            'weight' => 'nullable|string',
            'eye_right' => 'nullable|string',
            'eye_left' => 'nullable|string',
            'ear_right' => 'nullable|string',
            'ear_left' => 'nullable|string',
            'bp' => 'nullable|string',
            'heart' => 'nullable|string',
            'hernia' => 'nullable|string',
            'h_ceol' => 'nullable|string',
            's_bili' => 'nullable|string',
            'sgot' => 'nullable|string',
            'sgpt' => 'nullable|string',
            'vdrl' => 'nullable|string',
            'hiv' => 'nullable|string',
            'suger' => 'nullable|string',
            'filaria' => 'nullable|string',
            'hemoglo' => 'nullable|string',
            'factor' => 'nullable|string',
            's_urea' => 'nullable|string',
            'rbs' => 'nullable|string',
            's_creati' => 'nullable|string',
            'esr' => 'nullable|string',
            'tc' => 'nullable|string',
            'dc' => 'nullable|string',
            'neutrophils' => 'nullable|string',
            'lymphocytes' => 'nullable|string',
            'eosinophils' => 'nullable|string',
            'monocytes' => 'nullable|string',
            'basophils' => 'nullable|string',
            'rbc' => 'nullable|string',
            'lipid_profile_tg' => 'nullable|string',
            'platelets' => 'nullable|string',
            'tsh' => 'nullable|string',
            'wbc' => 'nullable|string',
            'total_t4' => 'nullable|string',
            'ecg' => 'nullable|string',
            'dop_thc' => 'nullable|string',
            'dop_opi' => 'nullable|string',
            'dop_amp' => 'nullable|string',
            'info' => 'nullable|string',
            'on_line' => 'nullable|string',
            'varicose_veins' => 'nullable|string',
            'psychiatry' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $patient = Patient::where('id', $request->patient_id)
            ->orWhere('pax_id', $request->patient_id)
            ->first();

        if (!$patient) {
            return response()->json(['error' => 'Patient not found'], 404);
        }

        $report = MedicalReport::updateOrCreate(
            ['patient_id' => $patient->id],
            array_merge($validator->validated(), [
                'patient_id' => $patient->id,
                // Ensure proper capitalization for status matches
                'final_status' => ucfirst(strtolower($request->final_status ?? 'Held up')),
                'is_online' => ucfirst(strtolower($request->is_online ?? 'No'))
            ])
        );

        return response()->json([
            'message' => 'Medical report saved successfully',
            'data' => $report
        ]);
    }
}
