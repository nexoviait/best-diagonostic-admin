<?php

namespace App\Http\Controllers;

use App\Models\CallbackRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CallbackRequestController extends Controller
{
    /**
     * Public: a patient asks the front desk to call them back.
     * Rate limited in routes/api.php.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'    => 'required|string|max:100',
            'mobile'  => ['required', 'string', 'max:20', 'regex:/^\+?[0-9][0-9\s\-]{6,18}$/'],
            'reason'  => 'nullable|string|max:100',
            'message' => 'nullable|string|max:1000',
        ], [
            'mobile.regex' => 'Please enter a valid mobile number.',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $callback = CallbackRequest::create([
            'name'    => trim($request->name),
            'mobile'  => trim($request->mobile),
            'reason'  => $request->reason ? trim($request->reason) : null,
            'message' => $request->message ? trim($request->message) : null,
        ]);

        return response()->json([
            'message' => 'Your request has been received. We will call you back shortly.',
            'id'      => $callback->id,
        ], 201);
    }

    /**
     * Staff: list callback requests (newest first), optionally filtered by status.
     */
    public function index(Request $request)
    {
        $query = CallbackRequest::query()->orderByDesc('id');

        if ($request->filled('status') && in_array($request->status, CallbackRequest::STATUSES, true)) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate((int) min(max($request->query('per_page', 20), 1), 100)));
    }

    /**
     * Staff: mark a request as called / closed (or back to pending).
     */
    public function update(Request $request, CallbackRequest $callbackRequest)
    {
        $validator = Validator::make($request->all(), [
            'status' => ['required', Rule::in(CallbackRequest::STATUSES)],
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $callbackRequest->status = $request->status;
        $callbackRequest->handled_at = $request->status === 'pending' ? null : now();
        $callbackRequest->handled_by = $request->status === 'pending' ? null : $request->user()->id;
        $callbackRequest->save();

        return response()->json($callbackRequest);
    }
}
