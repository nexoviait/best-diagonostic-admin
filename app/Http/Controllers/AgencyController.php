<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AgencyController extends Controller
{
    public function index(Request $request)
    {
        $query = Agency::orderBy('name', 'asc');

        // One-time (walk-in) agencies are hidden by default so they don't
        // permanently clutter the "pick an agency" pickers (e.g. Entry
        // Form) — pass ?include_one_time=1 to fetch the full list, used by
        // the Agency List management page and the Database filter dropdown
        // so historical records stay findable.
        if (!$request->boolean('include_one_time')) {
            $query->where('is_one_time', false);
        }

        return response()->json($query->get());
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
            'is_one_time' => 'nullable|boolean',
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
            'is_one_time' => $request->boolean('is_one_time'),
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
            'is_one_time' => 'nullable|boolean',
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
            'is_one_time' => $request->has('is_one_time') ? $request->boolean('is_one_time') : $agency->is_one_time,
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
