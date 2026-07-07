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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'company_name_en_title')) {
                $table->string('company_name_en_title')->nullable()->after('company_name_en');
            }
            if (!Schema::hasColumn('users', 'company_name_bn_title')) {
                $table->string('company_name_bn_title')->nullable()->after('company_name_bn');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['company_name_en_title', 'company_name_bn_title']);
        });
    }
};
