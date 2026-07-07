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
            if (!Schema::hasColumn('users', 'signature_physician_path')) {
                $table->string('signature_physician_path')->nullable()->after('logo_path');
            }
            if (!Schema::hasColumn('users', 'signature_radiologist_path')) {
                $table->string('signature_radiologist_path')->nullable()->after('signature_physician_path');
            }
            if (!Schema::hasColumn('users', 'signature_authorised_path')) {
                $table->string('signature_authorised_path')->nullable()->after('signature_radiologist_path');
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
                'signature_physician_path',
                'signature_radiologist_path',
                'signature_authorised_path',
            ]);
        });
    }
};
