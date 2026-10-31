<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DepartmentController extends Controller
{
    public function index()
    {
        return response()->json(Department::orderBy('name', 'asc')->get());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:departments,name',
            'status' => 'nullable|in:1,0',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $department = Department::create([
            'name' => $request->name,
            'status' => $request->status ?? '1',
        ]);

        return response()->json(['message' => 'Department added successfully', 'data' => $department], 201);
    }

    public function update(Request $request, $id)
    {
        $department = Department::find($id);
        if (!$department) {
            return response()->json(['error' => 'Department not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:departments,name,' . $id,
            'status' => 'nullable|in:1,0',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $department->update([
            'name' => $request->name,
            'status' => $request->status ?? $department->status,
        ]);

        return response()->json(['message' => 'Department updated successfully', 'data' => $department]);
    }

    public function destroy($id)
    {
        $department = Department::find($id);
        if (!$department) {
            return response()->json(['error' => 'Department not found'], 404);
        }

        $department->delete();
        return response()->json(['message' => 'Department deleted successfully']);
    }
}
