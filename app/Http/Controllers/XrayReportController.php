<?php

namespace App\Http\Controllers;

use App\Models\XrayReport;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class XrayReportController extends Controller
{
    public function show($patient_id_or_pax_id)
    {
        $patient = Patient::where('id', $patient_id_or_pax_id)
            ->orWhere('pax_id', $patient_id_or_pax_id)
            ->first();

        if (!$patient) {
            return response()->json(['error' => 'Patient not found'], 404);
        }

        $report = XrayReport::where('patient_id', $patient->id)->first();
        if (!$report) {
            $report = XrayReport::create([
                'patient_id' => $patient->id,
                'date' => date('Y-m-d'),
                'result' => 'Normal'
            ]);
        }

        return response()->json($report);
    }

    public function storeOrUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required',
            'date' => 'nullable|string',
            'remark' => 'nullable|string',
            'findings' => 'nullable|string',
            'result' => 'nullable|string|in:Normal,Abnormal,NORMAL,ABNORMAL',
            'xray_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
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

        $imagePath = null;
        if ($request->hasFile('xray_image')) {
            $imagePath = $request->file('xray_image')->store('xrays', 'public');
        }

        $updateData = array_filter([
            'date' => $request->date ?? date('Y-m-d'),
            'remark' => $request->remark,
            'findings' => $request->findings,
            'result' => ucfirst(strtolower($request->result ?? 'Normal')),
            'image_path' => $imagePath
        ]);

        $report = XrayReport::updateOrCreate(
            ['patient_id' => $patient->id],
            array_merge(['patient_id' => $patient->id], $updateData)
        );

        return response()->json([
            'message' => 'X-Ray report saved successfully',
            'data' => $report
        ]);
    }
}
