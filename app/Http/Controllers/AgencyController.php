<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AgencyController extends Controller
{
    public function index()
    {
        return response()->json(Agency::orderBy('name', 'asc')->get());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:agencies,name',
            'price' => 'nullable|numeric|min:0',
            'contact_person' => 'nullable|string',
            'email' => 'nullable|email',
            'mobile_no' => 'nullable|string',
            'address' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $agency = Agency::create([
            'name' => strtoupper($request->name),
            'contact_person' => $request->contact_person,
            'email' => $request->email,
            'mobile_no' => $request->mobile_no,
            'address' => $request->address,
            'price' => $request->price ?? 0.00,
            'status' => $request->status ?? '1',
        ]);

        return response()->json([
            'message' => 'Agency added successfully',
            'data' => $agency
        ], 201);
    }

    public function show($id)
    {
        $agency = Agency::find($id);
        if (!$agency) {
            return response()->json(['error' => 'Agency not found'], 404);
        }
        return response()->json($agency);
    }

    public function update(Request $request, $id)
    {
        $agency = Agency::find($id);
        if (!$agency) {
            return response()->json(['error' => 'Agency not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:agencies,name,' . $id,
            'price' => 'nullable|numeric|min:0',
            'contact_person' => 'nullable|string',
            'email' => 'nullable|email',
            'mobile_no' => 'nullable|string',
            'address' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $agency->update([
            'name' => strtoupper($request->name),
            'contact_person' => $request->contact_person,
            'email' => $request->email,
            'mobile_no' => $request->mobile_no,
            'address' => $request->address,
            'price' => $request->price ?? $agency->price,
            'status' => $request->status ?? $agency->status,
        ]);

        return response()->json([
            'message' => 'Agency updated successfully',
            'data' => $agency
        ]);
    }

    public function destroy($id)
    {
        $agency = Agency::find($id);
        if (!$agency) {
            return response()->json(['error' => 'Agency not found'], 404);
        }

        $agency->delete();
        return response()->json(['message' => 'Agency deleted successfully']);
    }
}
