<?php

namespace App\Http\Controllers;

use App\Models\FinanceCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FinanceCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = FinanceCategory::orderBy('name');

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|in:expense,revenue',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        if (FinanceCategory::where('name', $request->name)->where('type', $request->type)->exists()) {
            return response()->json(['name' => ['This category already exists for this type.']], 422);
        }

        $category = FinanceCategory::create([
            'name' => $request->name,
            'type' => $request->type,
            'status' => $request->status ?? '1',
        ]);

        return response()->json(['message' => 'Category added successfully', 'data' => $category], 201);
    }

    public function update(Request $request, $id)
    {
        $category = FinanceCategory::find($id);
        if (! $category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|in:expense,revenue',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        if (
            FinanceCategory::where('name', $request->name)->where('type', $request->type)
                ->where('id', '!=', $category->id)->exists()
        ) {
            return response()->json(['name' => ['This category already exists for this type.']], 422);
        }

        $category->update([
            'name' => $request->name,
            'type' => $request->type,
            'status' => $request->status ?? $category->status,
        ]);

        return response()->json(['message' => 'Category updated successfully', 'data' => $category]);
    }

    public function destroy($id)
    {
        $category = FinanceCategory::find($id);
        if (! $category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        if ($category->expenses()->exists() || $category->revenues()->exists()) {
            return response()->json(['error' => 'This category is used by existing records and cannot be deleted.'], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted successfully']);
    }
}
