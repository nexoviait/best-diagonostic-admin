<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One-time e-mail codes for "Forgot password" in the mobile app. Only a hash of the code
        // is stored, and a code dies after 5 wrong guesses or when it expires.
        Schema::create('password_reset_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->nullable();
        });

        // Tokens issued before this moment can no longer be refreshed (see AuthController::refresh),
        // so a reset also cuts off a stolen phone that still holds a valid token.
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('password_changed_at')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('password_changed_at');
        });
        Schema::dropIfExists('password_reset_codes');
    }
};
