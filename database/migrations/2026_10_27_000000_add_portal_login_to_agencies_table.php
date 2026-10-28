<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            $table->string('username')->nullable()->unique()->after('email');
            $table->string('password')->nullable()->after('username');
            $table->timestamp('portal_last_login_at')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            $table->dropColumn(['username', 'password', 'portal_last_login_at']);
        });
    }
};
