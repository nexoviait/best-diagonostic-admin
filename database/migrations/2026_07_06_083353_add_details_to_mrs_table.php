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
        Schema::table('mrs', function (Blueprint $table) {
            if (!Schema::hasColumn('mrs', 'email')) {
                $table->string('email')->nullable()->after('name');
            }
            if (!Schema::hasColumn('mrs', 'mobile_no')) {
                $table->string('mobile_no')->nullable()->after('email');
            }
            if (!Schema::hasColumn('mrs', 'status')) {
                $table->string('status')->default('1')->after('role'); // '1' = Active, '0' = Inactive
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mrs', function (Blueprint $table) {
            $table->dropColumn(['email', 'mobile_no', 'status']);
        });
    }
};
