<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectController extends Controller
{
    public function index()
    {
        // withSum keeps "Actual Spent" a single query instead of N+1 — Project::getActualSpentAttribute()
        // picks up expenses_sum_amount automatically when it's present.
        return response()->json(Project::withSum('expenses', 'amount')->orderBy('name')->get());
    }

    public function show($id)
    {
        $project = Project::withSum('expenses', 'amount')
            ->with(['expenses' => fn ($q) => $q->orderByDesc('date_incurred')])
            ->find($id);

        if (! $project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        return response()->json($project);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:projects,name',
            'description' => 'nullable|string',
            'budget' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:Active,Completed,On Hold',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $project = Project::create([
            'name' => $request->name,
            'description' => $request->description,
            'budget' => $request->budget,
            'status' => $request->status ?? 'Active',
        ]);

        return response()->json(['message' => 'Project added successfully', 'data' => $project], 201);
    }

    public function update(Request $request, $id)
    {
        $project = Project::find($id);
        if (! $project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:projects,name,' . $project->id,
            'description' => 'nullable|string',
            'budget' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:Active,Completed,On Hold',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $project->update([
            'name' => $request->name,
            'description' => $request->description,
            'budget' => $request->budget,
            'status' => $request->status ?? $project->status,
        ]);

        return response()->json(['message' => 'Project updated successfully', 'data' => $project]);
    }

    public function destroy($id)
    {
        $project = Project::find($id);
        if (! $project) {
            return response()->json(['error' => 'Project not found'], 404);
        }

        if ($project->expenses()->exists() || $project->revenues()->exists()) {
            return response()->json(['error' => 'This project has linked expenses/revenue and cannot be deleted.'], 422);
        }

        $project->delete();

        return response()->json(['message' => 'Project deleted successfully']);
    }
}
