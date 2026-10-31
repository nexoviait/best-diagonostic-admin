<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Finance module: Expense & Revenue tracking, gated behind the "view_finance" /
 * "manage_finance" permissions (see RoleController / EnsurePermission middleware).
 *
 * finance_categories is shared by both expenses and revenues (a `type` column tells them
 * apart) rather than two near-identical category tables. vendors is the counterparty on
 * both sides too — "who you paid" for an expense, "who paid you" for a revenue.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['expense', 'revenue']);
            $table->string('status')->default('1'); // '1' = Active, '0' = Inactive
            $table->timestamps();
            $table->unique(['name', 'type']);
        });

        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('email')->nullable();
            $table->string('mobile_no')->nullable();
            $table->string('address')->nullable();
            $table->string('status')->default('1');
            $table->timestamps();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('budget', 12, 2)->nullable();
            $table->string('status')->default('Active'); // Active, Completed, On Hold
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finance_category_id')->constrained()->restrictOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('date_incurred');
            $table->boolean('is_recurring')->default(false);
            $table->text('description')->nullable();
            $table->string('receipt_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('revenues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('finance_category_id')->constrained()->restrictOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('date_received');
            $table->boolean('is_recurring')->default(false);
            $table->text('description')->nullable();
            $table->string('receipt_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenues');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('vendors');
        Schema::dropIfExists('finance_categories');
    }
};
