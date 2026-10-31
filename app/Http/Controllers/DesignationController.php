<?php

namespace App\Http\Controllers;

use App\Models\Designation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DesignationController extends Controller
{
    public function index()
    {
        return response()->json(Designation::orderBy('name', 'asc')->get());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:designations,name',
            'status' => 'nullable|in:1,0',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $designation = Designation::create([
            'name' => $request->name,
            'status' => $request->status ?? '1',
        ]);

        return response()->json(['message' => 'Designation added successfully', 'data' => $designation], 201);
    }

    public function update(Request $request, $id)
    {
        $designation = Designation::find($id);
        if (!$designation) {
            return response()->json(['error' => 'Designation not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:designations,name,' . $id,
            'status' => 'nullable|in:1,0',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $designation->update([
            'name' => $request->name,
            'status' => $request->status ?? $designation->status,
        ]);

        return response()->json(['message' => 'Designation updated successfully', 'data' => $designation]);
    }

    public function destroy($id)
    {
        $designation = Designation::find($id);
        if (!$designation) {
            return response()->json(['error' => 'Designation not found'], 404);
        }

        $designation->delete();
        return response()->json(['message' => 'Designation deleted successfully']);
    }
}
