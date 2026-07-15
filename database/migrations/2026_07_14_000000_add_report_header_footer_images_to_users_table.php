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
            if (!Schema::hasColumn('users', 'report_header_image_path')) {
                $table->string('report_header_image_path')->nullable()->after('signature_authorised_path');
            }
            if (!Schema::hasColumn('users', 'report_footer_image_path')) {
                $table->string('report_footer_image_path')->nullable()->after('report_header_image_path');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'report_header_image_path',
                'report_footer_image_path',
            ]);
        });
    }
};
