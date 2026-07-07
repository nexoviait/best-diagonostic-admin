<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\User;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $allPermissions = [
            'view_dashboard',
            'view_database',
            'add_patient',
            'edit_report',
            'upload_xray',
            'view_mr_list',
            'view_agency_list',
            'view_country_list',
            'view_agency_balance',
            'manage_users',
            'manage_settings',
        ];

        // 1. Superadmin (Has everything)
        $superadmin = Role::firstOrCreate(
            ['name' => 'Superadmin'],
            ['permissions' => $allPermissions]
        );

        // 2. Front Desk / Receive (Limited menus, can add patients but maybe not edit reports)
        $receive = Role::firstOrCreate(
            ['name' => 'Receive'],
            ['permissions' => [
                'view_dashboard',
                'view_database',
                'add_patient',
                'upload_xray',
                'view_mr_list',
                'view_agency_list',
                'view_country_list',
                'view_agency_balance'
            ]]
        );

        // 3. Read Only
        $readonly = Role::firstOrCreate(
            ['name' => 'Read-only'],
            ['permissions' => [
                'view_dashboard',
                'view_database',
                'view_mr_list',
                'view_agency_list',
                'view_country_list',
                'view_agency_balance'
            ]]
        );

        // Assign Superadmin to all existing Admin users
        User::where('role', 'Admin')->update(['role_id' => $superadmin->id]);
        
        // Assign Receive to all existing MR users as default
        User::where('role', 'MR')->whereNull('role_id')->update(['role_id' => $receive->id]);
    }
}
