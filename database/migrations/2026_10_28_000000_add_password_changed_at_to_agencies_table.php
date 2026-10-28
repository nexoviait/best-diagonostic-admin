<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Same purpose as users.password_changed_at: an agency that changes its portal password should
 * have any already-issued token fail to refresh, same as a staff password change does.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            $table->timestamp('portal_password_changed_at')->nullable()->after('portal_last_login_at');
        });
    }

    public function down(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            $table->dropColumn('portal_password_changed_at');
        });
    }
};
