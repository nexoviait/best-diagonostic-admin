<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Traits\StoresPublicUploads;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class EmployeeController extends Controller
{
    use StoresPublicUploads;

    private function rules($id = null): array
    {
        return [
            'name' => 'required|string',
            'department_id' => 'nullable|exists:departments,id',
            'designation_id' => 'nullable|exists:designations,id',
            'email' => 'nullable|email',
            'mobile_no' => 'nullable|string',
            'address' => 'nullable|string',
            'join_date' => 'nullable|date',
            'basic_salary' => 'required|numeric|min:0',
            'bank_name' => 'nullable|string',
            'bank_account_no' => 'nullable|string',
            'status' => 'nullable|in:1,0',
            'photo' => 'nullable|file|mimes:jpeg,png,jpg,gif|max:4096',
        ];
    }

    public function index(Request $request)
    {
        $query = Employee::with(['department', 'designation']);

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->query('department_id'));
        }
        if ($request->filled('designation_id')) {
            $query->where('designation_id', $request->query('designation_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('employee_code', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('name', 'asc')->get());
    }

    public function show($id)
    {
        $employee = Employee::with(['department', 'designation'])->find($id);
        if (!$employee) {
            return response()->json(['error' => 'Employee not found'], 404);
        }

        return response()->json($employee);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), $this->rules());

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $this->storePublicUpload($request->file('photo'), 'employees', 'employee');
        }

        DB::beginTransaction();
        try {
            // Lock ensures no two concurrent requests get the same employee code.
            $maxId = Employee::lockForUpdate()->max('id') ?? 0;
            $employeeCode = 'EMP' . str_pad($maxId + 1, 4, '0', STR_PAD_LEFT);

            $employee = Employee::create(array_merge($validator->validated(), [
                'employee_code' => $employeeCode,
                'photo_path' => $photoPath,
                'status' => $request->status ?? '1',
            ]));

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'message' => 'Employee added successfully',
            'data' => Employee::with(['department', 'designation'])->find($employee->id),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $employee = Employee::find($id);
        if (!$employee) {
            return response()->json(['error' => 'Employee not found'], 404);
        }

        $validator = Validator::make($request->all(), $this->rules($id));

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $updates = $validator->validated();
        unset($updates['photo']);
        $updates['status'] = $request->status ?? $employee->status;

        if ($request->hasFile('photo')) {
            $updates['photo_path'] = $this->storePublicUpload($request->file('photo'), 'employees', 'employee');
        }

        $employee->update($updates);

        return response()->json([
            'message' => 'Employee updated successfully',
            'data' => Employee::with(['department', 'designation'])->find($employee->id),
        ]);
    }

    public function destroy($id)
    {
        $employee = Employee::find($id);
        if (!$employee) {
            return response()->json(['error' => 'Employee not found'], 404);
        }

        if ($employee->payrolls()->exists()) {
            return response()->json(['error' => 'This employee has payroll records and cannot be deleted.'], 422);
        }

        $employee->delete();
        return response()->json(['message' => 'Employee deleted successfully']);
    }
}
