<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Countries table
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        // 2. Agencies table
        Schema::create('agencies', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->decimal('price', 10, 2)->default(0.00);
            $table->timestamps();
        });

        // 3. Mrs (Representatives) table
        Schema::create('mrs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('role')->default('MR');
            $table->timestamps();
        });

        // 4. Patients table
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('pax_id')->unique();
            $table->string('date')->nullable()->index();
            $table->foreignId('country_id')->constrained('countries')->onDelete('cascade');
            $table->string('nationality')->default('BANGLADESH');
            $table->string('first_name')->index();
            $table->string('last_name')->nullable();
            $table->string('father_name')->nullable();
            $table->string('mother_name')->nullable();
            $table->string('mobile_no')->nullable();
            $table->string('dob')->nullable();
            $table->string('sex')->nullable(); // Male, Female
            $table->string('passport_no')->nullable()->index();
            $table->string('visa_no')->nullable();
            $table->string('issue_date')->nullable();
            $table->string('job_applied')->nullable();
            $table->foreignId('agency_id')->constrained('agencies')->onDelete('cascade');
            $table->foreignId('mr_id')->constrained('mrs')->onDelete('cascade');
            $table->string('image_path')->nullable();
            $table->decimal('medical_fee', 10, 2)->default(0.00);
            $table->decimal('received_amount', 10, 2)->default(0.00);
            $table->decimal('due_amount', 10, 2)->default(0.00);
            $table->decimal('niddle_charge', 10, 2)->default(0.00);
            $table->string('in_words')->nullable();
            $table->timestamps();
        });

        // 5. Medical Reports (Malaysia Test Panel / general) table
        Schema::create('medical_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            
            // Standard test parameters (default Negative)
            $table->string('bld_group')->default('Negative');
            $table->string('hiv_antibody')->default('Negative');
            $table->string('hbsag')->default('Negative');
            $table->string('hcv')->default('Negative');
            $table->string('malaria')->default('N/A');
            $table->string('tpha')->default('Negative');
            $table->string('tb')->default('Negative');
            $table->string('filariasis')->default('Negative');
            $table->string('leishmaniasis')->default('Negative');
            $table->string('leprosy')->default('Negative');
            $table->string('free_from_chronic')->default('Negative');
            $table->string('tumor_cancer')->default('Negative');
            $table->string('epilepsy')->default('Negative');
            $table->string('mental_illness')->default('Negative');
            $table->string('pregnancy')->default('Negative');
            $table->string('xray')->default('Negative');
            $table->string('physical')->default('Negative');

            // Numeric/value specific parameters
            $table->string('amp')->nullable(); // Amphetamine
            $table->string('albumin')->nullable();

            $table->text('medical_history')->nullable();
            $table->text('comments')->nullable();
            $table->string('final_status')->default('Pending')->index(); // Fit, Unfit, Pending
            $table->string('is_online')->default('No'); // Yes, No
            $table->string('height')->nullable();
            $table->string('wight')->nullable();
            $table->string('eye_right')->nullable();
            $table->string('eye_left')->nullable();
            $table->string('ear_right')->nullable();
            $table->string('ear_left')->nullable();
            $table->string('bp')->nullable();
            $table->string('heart')->nullable();
            $table->string('hernia')->nullable();
            $table->string('h_ceol')->nullable();
            $table->string('s_bili')->nullable();
            $table->string('sgot')->nullable();
            $table->string('sgpt')->nullable();
            $table->string('vdrl')->nullable();
            $table->string('hiv')->nullable();
            $table->string('suger')->nullable();
            $table->string('filaria')->nullable();
            $table->string('hemoglo')->nullable();
            $table->string('factor')->nullable();
            $table->string('s_urea')->nullable();
            $table->string('rbs')->nullable();
            $table->string('s_creati')->nullable();
            $table->string('esr')->nullable();
            $table->string('tc')->nullable();
            $table->string('dc')->nullable();
            $table->string('neutrophils')->nullable();
            $table->string('lymphocytes')->nullable();
            $table->string('eosinophils')->nullable();
            $table->string('monocytes')->nullable();
            $table->string('basophils')->nullable();
            $table->string('rbc')->nullable();
            $table->string('lipid_profile_tg')->nullable();
            $table->string('platelets')->nullable();
            $table->string('tsh')->nullable();
            $table->string('wbc')->nullable();
            $table->string('total_t4')->nullable();
            $table->string('ecg')->nullable();
            $table->string('dop_thc')->nullable();
            $table->string('dop_opi')->nullable();
            $table->string('dop_amp')->nullable();
            $table->string('info')->nullable();
            $table->string('on_line')->nullable();

            $table->timestamps();
        });

        // 6. Xray Reports table
        Schema::create('xray_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->string('date')->nullable();
            $table->text('remark')->nullable();
            $table->text('findings')->nullable();
            $table->string('result')->default('Normal')->index(); // Normal, Abnormal
            $table->string('image_path')->nullable();
            $table->timestamps();
        });

        // 7. Agency Invoices (Receipts / payments) table
        Schema::create('agency_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no')->unique();
            $table->foreignId('agency_id')->constrained('agencies')->onDelete('cascade');
            $table->string('date')->nullable()->index();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->decimal('net_amount', 10, 2)->default(0.00);
            $table->decimal('received_amount', 10, 2)->default(0.00);
            $table->decimal('due_amount', 10, 2)->default(0.00);
            $table->string('in_words')->nullable();
            $table->string('payment_month')->nullable(); // format "YYYY-MM"
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agency_invoices');
        Schema::dropIfExists('xray_reports');
        Schema::dropIfExists('medical_reports');
        Schema::dropIfExists('patients');
        Schema::dropIfExists('mrs');
        Schema::dropIfExists('agencies');
        Schema::dropIfExists('countries');
    }
};
