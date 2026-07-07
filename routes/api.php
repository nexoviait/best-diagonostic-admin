<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CountryController;
use App\Http\Controllers\AgencyController;
use App\Http\Controllers\MrController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\MedicalReportController;
use App\Http\Controllers\XrayReportController;
use App\Http\Controllers\InvoiceController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ─── Public Auth Routes ─────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('login',   [AuthController::class, 'login']);
    Route::post('logout',  [AuthController::class, 'logout'])->middleware('auth:api');
    Route::post('refresh', [AuthController::class, 'refresh'])->middleware('auth:api');
    Route::get('me',       [AuthController::class, 'me'])->middleware('auth:api');
    Route::match(['put', 'post'], 'profile',  [AuthController::class, 'updateProfile'])->middleware('auth:api');
    Route::put('password', [AuthController::class, 'changePassword'])->middleware('auth:api');
});

// ─── Public Read-Only Routes ─────────────────────────────────────────────────
Route::get('public/check-report',  [PatientController::class, 'getPublicReport']);
Route::get('public/site-settings', [PatientController::class, 'getPublicSettings']);

// ─── Protected Routes (any authenticated user) ───────────────────────────────
Route::middleware('auth:api')->group(function () {
    Route::get('dashboard', [PatientController::class, 'dashboardStats']);

    // Reference data (read-accessible to all roles)
    Route::apiResource('countries', CountryController::class);
    Route::apiResource('agencies',  AgencyController::class);
    Route::apiResource('mrs',       MrController::class);
    Route::apiResource('patients',  PatientController::class);

    // Medical & Xray Reports
    Route::get('medical-reports/{patient_id}',  [MedicalReportController::class, 'show']);
    Route::post('medical-reports',              [MedicalReportController::class, 'storeOrUpdate']);

    Route::get('xray-reports/{patient_id}',    [XrayReportController::class, 'show']);
    Route::post('xray-reports',                [XrayReportController::class, 'storeOrUpdate']);

    // Agency Invoices & Balance
    Route::apiResource('invoices', InvoiceController::class)->only(['index', 'store']);

    // ─── Admin-only Routes (require Admin role) ──────────────────────────────
    Route::middleware('admin')->group(function () {
        Route::apiResource('users', AuthController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::post('auth/register', [AuthController::class, 'register']);
        
        // Roles & Permissions
        Route::apiResource('roles', \App\Http\Controllers\RoleController::class)->except(['create', 'edit', 'show']);
    });
});
