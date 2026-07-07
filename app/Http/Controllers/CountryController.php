<?php

namespace App\Http\Controllers;

use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CountryController extends Controller
{
    public function index()
    {
        return response()->json(Country::orderBy('name', 'asc')->get());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:countries,name',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $country = Country::create([
            'name' => strtoupper($request->name),
        ]);

        return response()->json([
            'message' => 'Country added successfully',
            'data' => $country
        ], 201);
    }

    public function show($id)
    {
        $country = Country::find($id);
        if (!$country) {
            return response()->json(['error' => 'Country not found'], 404);
        }
        return response()->json($country);
    }

    public function update(Request $request, $id)
    {
        $country = Country::find($id);
        if (!$country) {
            return response()->json(['error' => 'Country not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:countries,name,' . $id,
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $country->update([
            'name' => strtoupper($request->name),
        ]);

        return response()->json([
            'message' => 'Country updated successfully',
            'data' => $country
        ]);
    }

    public function destroy($id)
    {
        $country = Country::find($id);
        if (!$country) {
            return response()->json(['error' => 'Country not found'], 404);
        }

        $country->delete();
        return response()->json(['message' => 'Country deleted successfully']);
    }
}
