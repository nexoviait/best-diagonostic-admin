<?php

namespace App\Http\Controllers;

use App\Models\AgencyInvoice;
use App\Models\Agency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = AgencyInvoice::with(['agency', 'user']);

        if ($request->filled('agency_id')) {
            $query->where('agency_id', $request->agency_id);
        }
        if ($request->filled('from_date')) {
            $query->where('date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->where('date', '<=', $request->to_date);
        }

        $invoices = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'invoices' => $invoices,
            'summary'  => [
                'net_total'      => $invoices->sum('net_amount'),
                'received_total' => $invoices->sum('received_amount'),
                'due_total'      => $invoices->sum('due_amount'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'agency_id'       => 'required|exists:agencies,id',
            'date'            => 'nullable|date',
            'net_amount'      => 'required|numeric',
            'received_amount' => 'required|numeric',
            'due_amount'      => 'required|numeric',
            'in_words'        => 'nullable|string|max:500',
            'payment_month'   => 'nullable|string|max:7',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // FIX: generate invoice number atomically inside a transaction to avoid race conditions
        $invoice = DB::transaction(function () use ($request, $validator) {
            $maxId     = AgencyInvoice::lockForUpdate()->max('id') ?? 0;
            $invoiceNo = 'TR' . str_pad($maxId + 1, 5, '0', STR_PAD_LEFT);

            return AgencyInvoice::create(array_merge(
                $validator->validated(),
                [
                    'invoice_no' => $invoiceNo,
                    'user_id'    => Auth::guard('api')->id() ?? 1,
                    'date'       => $request->date ?? date('Y-m-d'),
                ]
            ));
        });

        return response()->json([
            'message' => 'Invoice created successfully',
            'data'    => AgencyInvoice::with(['agency', 'user'])->find($invoice->id),
        ], 201);
    }
}
