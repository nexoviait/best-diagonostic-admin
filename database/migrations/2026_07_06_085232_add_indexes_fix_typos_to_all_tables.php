<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * QA / Performance Migration
 * ──────────────────────────
 * 1. Rename medical_reports.wight → weight  (typo fix)
 * 2. Add unique constraints to medical_reports & xray_reports (true 1:1 with patients)
 * 3. Add missing indexes on FK columns and common query columns
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Fix the weight typo in medical_reports ──────────────────────────
        Schema::table('medical_reports', function (Blueprint $table) {
            $table->renameColumn('wight', 'weight');
        });

        // ── Add unique constraints (enforce true 1:1 relationships) ─────────
        Schema::table('medical_reports', function (Blueprint $table) {
            // patient_id FK already exists; add unique + index
            $table->unique('patient_id', 'medical_reports_patient_id_unique');
        });

        Schema::table('xray_reports', function (Blueprint $table) {
            $table->unique('patient_id', 'xray_reports_patient_id_unique');
        });

        // ── Indexes on patients for common query patterns ────────────────────
        Schema::table('patients', function (Blueprint $table) {
            // Composite: agency lookup + date range (very common query)
            $table->index(['agency_id', 'date'], 'patients_agency_date_idx');
            // MR filter
            $table->index('mr_id', 'patients_mr_id_idx');
            // Full-name search uses concat — add index on first_name already exists in migration
            // date already indexed
        });

        // ── Index agency_invoices for balance sheet queries ───────────────────
        Schema::table('agency_invoices', function (Blueprint $table) {
            $table->index(['agency_id', 'date'], 'invoices_agency_date_idx');
            $table->index('user_id', 'invoices_user_id_idx');
        });

        // ── Index mrs.name (used in dropdowns / search) ───────────────────────
        Schema::table('mrs', function (Blueprint $table) {
            $table->index('name', 'mrs_name_idx');
        });
    }

    public function down(): void
    {
        Schema::table('medical_reports', function (Blueprint $table) {
            $table->dropUnique('medical_reports_patient_id_unique');
            $table->renameColumn('weight', 'wight');
        });

        Schema::table('xray_reports', function (Blueprint $table) {
            $table->dropUnique('xray_reports_patient_id_unique');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex('patients_agency_date_idx');
            $table->dropIndex('patients_mr_id_idx');
        });

        Schema::table('agency_invoices', function (Blueprint $table) {
            $table->dropIndex('invoices_agency_date_idx');
            $table->dropIndex('invoices_user_id_idx');
        });

        Schema::table('mrs', function (Blueprint $table) {
            $table->dropIndex('mrs_name_idx');
        });
    }
};
