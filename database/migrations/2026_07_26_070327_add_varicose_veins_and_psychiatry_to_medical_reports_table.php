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
        Schema::table('medical_reports', function (Blueprint $table) {
            if (!Schema::hasColumn('medical_reports', 'varicose_veins')) {
                $table->text('varicose_veins')->nullable();
            }
            if (!Schema::hasColumn('medical_reports', 'psychiatry')) {
                $table->text('psychiatry')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('medical_reports', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('medical_reports', 'varicose_veins')) {
                $columnsToDrop[] = 'varicose_veins';
            }
            if (Schema::hasColumn('medical_reports', 'psychiatry')) {
                $columnsToDrop[] = 'psychiatry';
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
