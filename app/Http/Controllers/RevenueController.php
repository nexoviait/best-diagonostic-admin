<?php

namespace App\Http\Controllers;

use App\Models\Revenue;
use App\Traits\StoresPublicUploads;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RevenueController extends Controller
{
    use StoresPublicUploads;

    private function rules(): array
    {
        return [
            'finance_category_id' => ['required', Rule::exists('finance_categories', 'id')->where('type', 'revenue')],
            'vendor_id' => 'nullable|exists:vendors,id',
            'project_id' => 'nullable|exists:projects,id',
            'amount' => 'required|numeric|min:0.01',
            'date_received' => 'required|date',
            'is_recurring' => 'nullable|boolean',
            'description' => 'nullable|string',
            'receipt' => 'nullable|file|mimes:jpeg,png,jpg,gif,pdf|max:4096',
        ];
    }

    public function index(Request $request)
    {
        $query = Revenue::with(['category', 'vendor', 'project', 'creator']);

        if ($request->filled('from_date')) {
            $query->where('date_received', '>=', $request->query('from_date'));
        }
        if ($request->filled('to_date')) {
            $query->where('date_received', '<=', $request->query('to_date'));
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

        return response()->json($query->orderByDesc('date_received')->orderByDesc('id')->get());
    }

    public function show($id)
    {
        $revenue = Revenue::with(['category', 'vendor', 'project', 'creator'])->find($id);
        if (! $revenue) {
            return response()->json(['error' => 'Revenue not found'], 404);
        }

        return response()->json($revenue);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), $this->rules(), [], [
            'finance_category_id' => 'revenue category',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $receiptPath = $this->storePublicUpload($request->file('receipt'), 'finance/receipts', 'revenue');
        }

        $revenue = Revenue::create(array_merge($validator->validated(), [
            'receipt_path' => $receiptPath,
            'is_recurring' => $request->boolean('is_recurring'),
            'created_by' => Auth::guard('api')->id(),
        ]));

        return response()->json([
            'message' => 'Revenue recorded successfully',
            'data' => Revenue::with(['category', 'vendor', 'project', 'creator'])->find($revenue->id),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $revenue = Revenue::find($id);
        if (! $revenue) {
            return response()->json(['error' => 'Revenue not found'], 404);
        }

        $validator = Validator::make($request->all(), $this->rules(), [], [
            'finance_category_id' => 'revenue category',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $updates = $validator->validated();
        unset($updates['receipt']);
        $updates['is_recurring'] = $request->boolean('is_recurring');

        if ($request->hasFile('receipt')) {
            $updates['receipt_path'] = $this->storePublicUpload($request->file('receipt'), 'finance/receipts', 'revenue');
        }

        $revenue->update($updates);

        return response()->json([
            'message' => 'Revenue updated successfully',
            'data' => Revenue::with(['category', 'vendor', 'project', 'creator'])->find($revenue->id),
        ]);
    }

    public function destroy($id)
    {
        $revenue = Revenue::find($id);
        if (! $revenue) {
            return response()->json(['error' => 'Revenue not found'], 404);
        }

        $revenue->delete();

        return response()->json(['message' => 'Revenue deleted successfully']);
    }
}
