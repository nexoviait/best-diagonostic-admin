<?php

namespace App\Http\Controllers;

use App\Models\Mr;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MrController extends Controller
{
    public function index()
    {
        return response()->json(Mr::orderBy('name', 'asc')->get());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'role' => 'nullable|string',
            'email' => 'nullable|email',
            'mobile_no' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $mr = Mr::create([
            'name' => strtoupper($request->name),
            'email' => $request->email,
            'mobile_no' => $request->mobile_no,
            'role' => $request->role ?? 'MR',
            'status' => $request->status ?? '1',
        ]);

        return response()->json([
            'message' => 'MR added successfully',
            'data' => $mr
        ], 201);
    }

    public function show($id)
    {
        $mr = Mr::find($id);
        if (!$mr) {
            return response()->json(['error' => 'MR not found'], 404);
        }
        return response()->json($mr);
    }

    public function update(Request $request, $id)
    {
        $mr = Mr::find($id);
        if (!$mr) {
            return response()->json(['error' => 'MR not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'role' => 'nullable|string',
            'email' => 'nullable|email',
            'mobile_no' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $mr->update([
            'name' => strtoupper($request->name),
            'email' => $request->email,
            'mobile_no' => $request->mobile_no,
            'role' => $request->role ?? $mr->role,
            'status' => $request->status ?? $mr->status,
        ]);

        return response()->json([
            'message' => 'MR updated successfully',
            'data' => $mr
        ]);
    }

    public function destroy($id)
    {
        $mr = Mr::find($id);
        if (!$mr) {
            return response()->json(['error' => 'MR not found'], 404);
        }

        $mr->delete();
        return response()->json(['message' => 'MR deleted successfully']);
    }
}
