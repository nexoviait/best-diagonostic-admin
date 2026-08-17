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
        Schema::table('agencies', function (Blueprint $table) {
            // Agencies used for a single walk-in patient and never again.
            // Excluded by default from the "pick an agency" pickers (Entry
            // Form) so they don't permanently clutter that list, but they
            // stay in the table and remain visible/searchable on the Agency
            // List and Database filter pages so historical records are
            // never lost.
            $table->boolean('is_one_time')->default(false)->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            $table->dropColumn('is_one_time');
        });
    }
};
