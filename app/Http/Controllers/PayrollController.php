<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Payroll;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PayrollController extends Controller
{
    public function index(Request $request)
    {
        $query = Payroll::with(['employee.department', 'employee.designation']);

        if ($request->filled('month')) {
            $query->where('month', $request->query('month'));
        }
        if ($request->filled('year')) {
            $query->where('year', $request->query('year'));
        }
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->query('employee_id'));
        }
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->query('payment_status'));
        }

        return response()->json(
            $query->orderByDesc('year')->orderByDesc('month')->orderBy('employee_id')->get()
        );
    }

    public function show($id)
    {
        $payroll = Payroll::with(['employee.department', 'employee.designation'])->find($id);
        if (!$payroll) {
            return response()->json(['error' => 'Payroll record not found'], 404);
        }

        return response()->json($payroll);
    }

    // Bulk-creates a Pending payroll row for every active employee who doesn't already
    // have one for this month/year, seeded from their current basic salary.
    public function generate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2000|max:2100',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $month = (int) $request->month;
        $year = (int) $request->year;

        $existingEmployeeIds = Payroll::where('month', $month)->where('year', $year)->pluck('employee_id');

        $employees = Employee::where('status', '1')->whereNotIn('id', $existingEmployeeIds)->get();

        $created = [];
        foreach ($employees as $employee) {
            $created[] = Payroll::create([
                'employee_id' => $employee->id,
                'month' => $month,
                'year' => $year,
                'basic_salary' => $employee->basic_salary,
                'allowances' => 0,
                'deductions' => 0,
                'payment_status' => 'Pending',
                'generated_by' => Auth::guard('api')->id(),
            ]);
        }

        return response()->json([
            'message' => count($created) > 0
                ? count($created) . ' payroll record(s) generated.'
                : 'No new payroll records to generate — all active employees already have one for this period.',
            'created_count' => count($created),
            'skipped_count' => $existingEmployeeIds->count(),
        ], 201);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => [
                'required',
                'exists:employees,id',
                Rule::unique('payrolls', 'employee_id')->where('month', $request->month)->where('year', $request->year),
            ],
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2000|max:2100',
            'basic_salary' => 'required|numeric|min:0',
            'allowances' => 'nullable|numeric|min:0',
            'deductions' => 'nullable|numeric|min:0',
            'remarks' => 'nullable|string',
        ], [], ['employee_id' => 'employee']);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $payroll = Payroll::create(array_merge($validator->validated(), [
            'allowances' => $request->allowances ?? 0,
            'deductions' => $request->deductions ?? 0,
            'payment_status' => 'Pending',
            'generated_by' => Auth::guard('api')->id(),
        ]));

        return response()->json([
            'message' => 'Payroll record added successfully',
            'data' => Payroll::with(['employee.department', 'employee.designation'])->find($payroll->id),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $payroll = Payroll::find($id);
        if (!$payroll) {
            return response()->json(['error' => 'Payroll record not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'basic_salary' => 'required|numeric|min:0',
            'allowances' => 'nullable|numeric|min:0',
            'deductions' => 'nullable|numeric|min:0',
            'payment_status' => 'required|in:Pending,Paid',
            'payment_date' => 'nullable|date',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $updates = $validator->validated();
        $updates['allowances'] = $request->allowances ?? 0;
        $updates['deductions'] = $request->deductions ?? 0;

        // Marking a record Paid without an explicit date defaults to today, so the
        // payment trail doesn't end up with a null date on a record marked settled.
        if ($updates['payment_status'] === 'Paid' && empty($updates['payment_date'])) {
            $updates['payment_date'] = now()->toDateString();
        }

        $payroll->update($updates);

        return response()->json([
            'message' => 'Payroll record updated successfully',
            'data' => Payroll::with(['employee.department', 'employee.designation'])->find($payroll->id),
        ]);
    }

    public function destroy($id)
    {
        $payroll = Payroll::find($id);
        if (!$payroll) {
            return response()->json(['error' => 'Payroll record not found'], 404);
        }

        $payroll->delete();
        return response()->json(['message' => 'Payroll record deleted successfully']);
    }
}
