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
use App\Http\Controllers\AppSettingsController;
use App\Http\Controllers\CallbackRequestController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\PublicCertificateController;
use App\Http\Controllers\AgencyAuthController;
use App\Http\Controllers\AgencyPortalController;
use App\Http\Controllers\FinanceCategoryController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\RevenueController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DesignationController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\PayrollController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ─── Public Auth Routes ─────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('login',   [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:password-reset');
    Route::post('reset-password',  [PasswordResetController::class, 'reset'])->middleware('throttle:password-reset-verify');
    Route::post('logout',  [AuthController::class, 'logout'])->middleware('auth:api');
    // No auth:api here on purpose, see AuthController::refresh().
    Route::post('refresh', [AuthController::class, 'refresh'])->middleware('throttle:30,1');
    Route::get('me',       [AuthController::class, 'me'])->middleware('auth:api');
    Route::match(['put', 'post'], 'profile',  [AuthController::class, 'updateProfile'])->middleware('auth:api');
    Route::put('password', [AuthController::class, 'changePassword'])->middleware('auth:api');
});

// ─── Public Read-Only Routes ─────────────────────────────────────────────────
Route::get('public/check-report',  [PatientController::class, 'getPublicReport'])->middleware('throttle:public-lookup');
Route::get('public/site-settings', [PatientController::class, 'getPublicSettings']);

// Limited-exposure lookup + server-generated PDF certificate (used by the mobile app).
// The PDF link is short-lived and signed, so it cannot be guessed from a sequential token.
Route::get('public/certificate/search', [PublicCertificateController::class, 'search'])
    ->middleware('throttle:public-lookup');
Route::get('public/certificate/{pax_id}/pdf', [PublicCertificateController::class, 'pdf'])
    ->middleware(['signed:relative', 'throttle:public-pdf'])
    ->name('public.certificate.pdf');

// Patient asks the front desk to call back.
Route::post('public/callback-requests', [CallbackRequestController::class, 'store'])
    ->middleware('throttle:public-callback');

// ─── Agency Portal (separate "agency" guard — see config/auth.php) ──────────
Route::prefix('agency')->group(function () {
    Route::post('login', [AgencyAuthController::class, 'login'])->middleware('throttle:agency-login');
    // No auth:agency here on purpose, see AgencyAuthController::refresh() / AuthController::refresh().
    Route::post('refresh', [AgencyAuthController::class, 'refresh'])->middleware('throttle:30,1');

    Route::middleware('auth:agency')->group(function () {
        Route::get('me', [AgencyAuthController::class, 'me']);
        Route::post('logout', [AgencyAuthController::class, 'logout']);
        Route::put('profile', [AgencyAuthController::class, 'updateProfile']);
        Route::put('password', [AgencyAuthController::class, 'changePassword']);

        // Read-only reference data for the entry form's pickers.
        Route::get('countries', [CountryController::class, 'index']);
        Route::get('mrs', [MrController::class, 'index']);

        Route::get('patients', [AgencyPortalController::class, 'index']);
        Route::post('patients', [AgencyPortalController::class, 'store']);
        Route::get('patients/{pax_id}', [AgencyPortalController::class, 'show']);
        // PUT (not POST + _method spoofing): a photo update still needs multipart, and the
        // frontend sends that as POST with _method=PUT, which Laravel resolves to this route.
        Route::put('patients/{pax_id}', [AgencyPortalController::class, 'update']);
    });
});

// ─── Protected Routes (any authenticated user) ───────────────────────────────
Route::middleware('auth:api')->group(function () {
    Route::get('dashboard', [PatientController::class, 'dashboardStats']);
    Route::get('reports/summary', [\App\Http\Controllers\ReportController::class, 'summary']);

    // Reference data (read-accessible to all roles)
    Route::apiResource('countries', CountryController::class);
    Route::apiResource('agencies',  AgencyController::class);
    Route::apiResource('mrs',       MrController::class);
    Route::get('patients/creators', [PatientController::class, 'creators']);
    Route::apiResource('patients',  PatientController::class);

    // Medical & Xray Reports
    Route::get('medical-reports/{patient_id}',  [MedicalReportController::class, 'show']);
    Route::post('medical-reports',              [MedicalReportController::class, 'storeOrUpdate']);

    Route::get('xray-reports/{patient_id}',    [XrayReportController::class, 'show']);
    Route::post('xray-reports',                [XrayReportController::class, 'storeOrUpdate']);

    // E-mail provider + IT helpdesk settings (Site Settings page)
    Route::get('app-settings',              [AppSettingsController::class, 'show']);
    Route::put('app-settings',              [AppSettingsController::class, 'update']);
    Route::post('app-settings/test-email',  [AppSettingsController::class, 'testEmail']);

    // Callback requests (staff view / mark as called)
    Route::get('callback-requests',             [CallbackRequestController::class, 'index']);
    Route::patch('callback-requests/{callbackRequest}', [CallbackRequestController::class, 'update']);

    // Agency Invoices & Balance
    Route::apiResource('invoices', InvoiceController::class)->only(['index', 'store']);

    // ─── Finance: Expense & Revenue tracking (gated — see EnsurePermission) ──
    Route::middleware('permission:view_finance')->group(function () {
        Route::get('finance-categories', [FinanceCategoryController::class, 'index']);
        Route::get('vendors', [VendorController::class, 'index']);
        Route::get('projects', [ProjectController::class, 'index']);
        Route::get('projects/{id}', [ProjectController::class, 'show']);
        Route::get('expenses', [ExpenseController::class, 'index']);
        Route::get('expenses/{id}', [ExpenseController::class, 'show']);
        Route::get('revenues', [RevenueController::class, 'index']);
        Route::get('revenues/{id}', [RevenueController::class, 'show']);
    });

    Route::middleware('permission:manage_finance')->group(function () {
        Route::post('finance-categories', [FinanceCategoryController::class, 'store']);
        Route::put('finance-categories/{id}', [FinanceCategoryController::class, 'update']);
        Route::delete('finance-categories/{id}', [FinanceCategoryController::class, 'destroy']);

        Route::post('vendors', [VendorController::class, 'store']);
        Route::put('vendors/{id}', [VendorController::class, 'update']);
        Route::delete('vendors/{id}', [VendorController::class, 'destroy']);

        Route::post('projects', [ProjectController::class, 'store']);
        Route::put('projects/{id}', [ProjectController::class, 'update']);
        Route::delete('projects/{id}', [ProjectController::class, 'destroy']);

        Route::post('expenses', [ExpenseController::class, 'store']);
        // POST + _method=PUT: a receipt replace needs multipart, same pattern as patients/agency updates.
        Route::put('expenses/{id}', [ExpenseController::class, 'update']);
        Route::delete('expenses/{id}', [ExpenseController::class, 'destroy']);

        Route::post('revenues', [RevenueController::class, 'store']);
        Route::put('revenues/{id}', [RevenueController::class, 'update']);
        Route::delete('revenues/{id}', [RevenueController::class, 'destroy']);
    });

    // ─── HR: Employee directory (gated — see EnsurePermission) ───────────────
    Route::middleware('permission:view_employees')->group(function () {
        Route::get('departments', [DepartmentController::class, 'index']);
        Route::get('designations', [DesignationController::class, 'index']);
        Route::get('employees', [EmployeeController::class, 'index']);
        Route::get('employees/{id}', [EmployeeController::class, 'show']);
    });

    Route::middleware('permission:manage_employees')->group(function () {
        Route::post('departments', [DepartmentController::class, 'store']);
        Route::put('departments/{id}', [DepartmentController::class, 'update']);
        Route::delete('departments/{id}', [DepartmentController::class, 'destroy']);

        Route::post('designations', [DesignationController::class, 'store']);
        Route::put('designations/{id}', [DesignationController::class, 'update']);
        Route::delete('designations/{id}', [DesignationController::class, 'destroy']);

        Route::post('employees', [EmployeeController::class, 'store']);
        // POST + _method=PUT: a photo replace needs multipart, same pattern as other updates.
        Route::put('employees/{id}', [EmployeeController::class, 'update']);
        Route::delete('employees/{id}', [EmployeeController::class, 'destroy']);
    });

    // ─── Payroll Management (separate from Employee directory — salary data) ─
    Route::middleware('permission:view_payroll')->group(function () {
        Route::get('payrolls', [PayrollController::class, 'index']);
        Route::get('payrolls/{id}', [PayrollController::class, 'show']);
    });

    Route::middleware('permission:manage_payroll')->group(function () {
        Route::post('payrolls/generate', [PayrollController::class, 'generate']);
        Route::post('payrolls', [PayrollController::class, 'store']);
        Route::put('payrolls/{id}', [PayrollController::class, 'update']);
        Route::delete('payrolls/{id}', [PayrollController::class, 'destroy']);
    });

    // ─── Admin-only Routes (require Admin role) ──────────────────────────────
    Route::middleware('admin')->group(function () {
        Route::apiResource('users', AuthController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::post('auth/register', [AuthController::class, 'register']);
        
        // Roles & Permissions
        Route::apiResource('roles', \App\Http\Controllers\RoleController::class)->except(['create', 'edit', 'show']);
    });
});
