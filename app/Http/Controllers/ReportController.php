<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function summary(Request $request)
    {
        $user = auth()->user();
        if ($user->role !== 'Admin' && $user->role_name !== 'Superadmin' && !in_array('view_reports', $user->permissions)) {
            return response()->json(['error' => 'Unauthorized access to reports.'], 403);
        }

        $query = Patient::with(['country', 'agency', 'mr', 'medicalReport']);

        // Date filter
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        if ($fromDate) {
            $query->where('date', '>=', $fromDate);
        }
        if ($toDate) {
            $query->where('date', '<=', $toDate);
        }

        // Agency filter
        if ($request->filled('agency_id') && $request->agency_id !== 'all') {
            $query->where('agency_id', $request->agency_id);
        }

        // MR filter
        if ($request->filled('mr_id') && $request->mr_id !== 'all') {
            $query->where('mr_id', $request->mr_id);
        }

        // Fetch patients for report (sorted by date desc, then created_at desc)
        $patients = $query->orderBy('date', 'desc')->orderBy('created_at', 'desc')->get();

        // Calculate summary metrics
        $totalPatients = $patients->count();
        $totalSales = $patients->sum('received_amount');
        $totalDue = $patients->sum('due_amount');
        $totalFee = $patients->sum('medical_fee');

        $dailyStats = [];
        $weeklyStats = [];
        $monthlyStats = [];

        // Group daily stats
        $groupedByDate = $patients->groupBy('date');
        foreach ($groupedByDate as $date => $group) {
            $dailyStats[] = [
                'date' => $date,
                'patients_count' => $group->count(),
                'sales' => $group->sum('received_amount'),
                'dues' => $group->sum('due_amount'),
                'total_fee' => $group->sum('medical_fee'),
            ];
        }

        // Sort daily stats by date ascending
        usort($dailyStats, function ($a, $b) {
            return strcmp($a['date'], $b['date']);
        });

        // Weekly grouping
        $groupedByWeek = $patients->groupBy(function ($patient) {
            try {
                $date = Carbon::parse($patient->date);
                return $date->format('Y-W');
            } catch (\Exception $e) {
                return date('Y-W');
            }
        });

        foreach ($groupedByWeek as $weekKey => $group) {
            $parts = explode('-', $weekKey);
            $year = isset($parts[0]) ? (int)$parts[0] : (int)date('Y');
            $week = isset($parts[1]) ? (int)$parts[1] : (int)date('W');
            
            $dt = new Carbon();
            $dt->setISODate($year, $week);
            $startOfWeek = $dt->startOfWeek()->format('M d');
            $endOfWeek = $dt->endOfWeek()->format('M d, Y');
            
            $weeklyStats[] = [
                'week_key' => $weekKey,
                'label' => "Week $week ($startOfWeek - $endOfWeek)",
                'patients_count' => $group->count(),
                'sales' => $group->sum('received_amount'),
                'dues' => $group->sum('due_amount'),
                'total_fee' => $group->sum('medical_fee'),
            ];
        }

        usort($weeklyStats, function ($a, $b) {
            return strcmp($a['week_key'], $b['week_key']);
        });

        // Monthly grouping
        $groupedByMonth = $patients->groupBy(function ($patient) {
            try {
                $date = Carbon::parse($patient->date);
                return $date->format('Y-m');
            } catch (\Exception $e) {
                return date('Y-m');
            }
        });

        foreach ($groupedByMonth as $monthKey => $group) {
            try {
                $label = Carbon::parse($monthKey . '-01')->format('F Y');
            } catch (\Exception $e) {
                $label = $monthKey;
            }
            $monthlyStats[] = [
                'month_key' => $monthKey,
                'label' => $label,
                'patients_count' => $group->count(),
                'sales' => $group->sum('received_amount'),
                'dues' => $group->sum('due_amount'),
                'total_fee' => $group->sum('medical_fee'),
            ];
        }

        usort($monthlyStats, function ($a, $b) {
            return strcmp($a['month_key'], $b['month_key']);
        });

        return response()->json([
            'summary' => [
                'total_patients' => $totalPatients,
                'total_sales' => $totalSales,
                'total_due' => $totalDue,
                'total_medical_fee' => $totalFee,
            ],
            'daily_stats' => $dailyStats,
            'weekly_stats' => $weeklyStats,
            'monthly_stats' => $monthlyStats,
            'patients' => $patients,
        ]);
    }
}
