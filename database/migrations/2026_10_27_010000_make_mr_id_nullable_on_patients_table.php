<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Agency Portal's entry form no longer asks the agency to pick an MR (office staff assign it
 * later when they review the entry) — mr_id has to be nullable for those rows to be insertable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->foreignId('mr_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->foreignId('mr_id')->nullable(false)->change();
        });
    }
};
