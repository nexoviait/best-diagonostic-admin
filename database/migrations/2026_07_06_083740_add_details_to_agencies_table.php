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
            if (!Schema::hasColumn('agencies', 'contact_person')) {
                $table->string('contact_person')->nullable()->after('name');
            }
            if (!Schema::hasColumn('agencies', 'email')) {
                $table->string('email')->nullable()->after('contact_person');
            }
            if (!Schema::hasColumn('agencies', 'mobile_no')) {
                $table->string('mobile_no')->nullable()->after('email');
            }
            if (!Schema::hasColumn('agencies', 'address')) {
                $table->string('address')->nullable()->after('mobile_no');
            }
            if (!Schema::hasColumn('agencies', 'status')) {
                $table->string('status')->default('1')->after('price'); // '1' = Active, '0' = Inactive
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            $table->dropColumn(['contact_person', 'email', 'mobile_no', 'address', 'status']);
        });
    }
};
