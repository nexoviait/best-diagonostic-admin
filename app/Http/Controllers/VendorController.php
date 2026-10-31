<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class VendorController extends Controller
{
    public function index()
    {
        return response()->json(Vendor::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:vendors,name',
            'contact_person' => 'nullable|string',
            'email' => 'nullable|email',
            'mobile_no' => 'nullable|string',
            'address' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $vendor = Vendor::create([
            'name' => $request->name,
            'contact_person' => $request->contact_person,
            'email' => $request->email,
            'mobile_no' => $request->mobile_no,
            'address' => $request->address,
            'status' => $request->status ?? '1',
        ]);

        return response()->json(['message' => 'Vendor added successfully', 'data' => $vendor], 201);
    }

    public function update(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (! $vendor) {
            return response()->json(['error' => 'Vendor not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:vendors,name,' . $vendor->id,
            'contact_person' => 'nullable|string',
            'email' => 'nullable|email',
            'mobile_no' => 'nullable|string',
            'address' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $vendor->update([
            'name' => $request->name,
            'contact_person' => $request->contact_person,
            'email' => $request->email,
            'mobile_no' => $request->mobile_no,
            'address' => $request->address,
            'status' => $request->status ?? $vendor->status,
        ]);

        return response()->json(['message' => 'Vendor updated successfully', 'data' => $vendor]);
    }

    public function destroy($id)
    {
        $vendor = Vendor::find($id);
        if (! $vendor) {
            return response()->json(['error' => 'Vendor not found'], 404);
        }

        if ($vendor->expenses()->exists() || $vendor->revenues()->exists()) {
            return response()->json(['error' => 'This vendor has existing records and cannot be deleted.'], 422);
        }

        $vendor->delete();

        return response()->json(['message' => 'Vendor deleted successfully']);
    }
}
