<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Traits\StoresPublicUploads;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    use StoresPublicUploads;

    private function rules(): array
    {
        return [
            // Not just "does this id exist" — it must be a category created for expenses, not
            // one of the revenue-side categories, otherwise the two lists bleed into each other.
            'finance_category_id' => ['required', Rule::exists('finance_categories', 'id')->where('type', 'expense')],
            'vendor_id' => 'nullable|exists:vendors,id',
            'project_id' => 'nullable|exists:projects,id',
            'amount' => 'required|numeric|min:0.01',
            'date_incurred' => 'required|date',
            'is_recurring' => 'nullable|boolean',
            'description' => 'nullable|string',
            'receipt' => 'nullable|file|mimes:jpeg,png,jpg,gif,pdf|max:4096',
        ];
    }

    public function index(Request $request)
    {
        $query = Expense::with(['category', 'vendor', 'project', 'creator']);

        if ($request->filled('from_date')) {
            $query->where('date_incurred', '>=', $request->query('from_date'));
        }
        if ($request->filled('to_date')) {
            $query->where('date_incurred', '<=', $request->query('to_date'));
        }
        if ($request->filled('finance_category_id')) {
            $query->where('finance_category_id', $request->query('finance_category_id'));
        }
        if ($request->filled('vendor_id')) {
            $query->where('vendor_id', $request->query('vendor_id'));
        }
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->query('project_id'));
        }

        return response()->json($query->orderByDesc('date_incurred')->orderByDesc('id')->get());
    }

    public function show($id)
    {
        $expense = Expense::with(['category', 'vendor', 'project', 'creator'])->find($id);
        if (! $expense) {
            return response()->json(['error' => 'Expense not found'], 404);
        }

        return response()->json($expense);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), $this->rules(), [], [
            'finance_category_id' => 'expense category',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $receiptPath = $this->storePublicUpload($request->file('receipt'), 'finance/receipts', 'expense');
        }

        $expense = Expense::create(array_merge($validator->validated(), [
            'receipt_path' => $receiptPath,
            'is_recurring' => $request->boolean('is_recurring'),
            'created_by' => Auth::guard('api')->id(),
        ]));

        return response()->json([
            'message' => 'Expense recorded successfully',
            'data' => Expense::with(['category', 'vendor', 'project', 'creator'])->find($expense->id),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::find($id);
        if (! $expense) {
            return response()->json(['error' => 'Expense not found'], 404);
        }

        $validator = Validator::make($request->all(), $this->rules(), [], [
            'finance_category_id' => 'expense category',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $updates = $validator->validated();
        unset($updates['receipt']);
        $updates['is_recurring'] = $request->boolean('is_recurring');

        if ($request->hasFile('receipt')) {
            $updates['receipt_path'] = $this->storePublicUpload($request->file('receipt'), 'finance/receipts', 'expense');
        }

        $expense->update($updates);

        return response()->json([
            'message' => 'Expense updated successfully',
            'data' => Expense::with(['category', 'vendor', 'project', 'creator'])->find($expense->id),
        ]);
    }

    public function destroy($id)
    {
        $expense = Expense::find($id);
        if (! $expense) {
            return response()->json(['error' => 'Expense not found'], 404);
        }

        $expense->delete();

        return response()->json(['message' => 'Expense deleted successfully']);
    }
}
