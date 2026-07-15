<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Role;
use App\Models\Patient;
use App\Models\Country;
use App\Models\Agency;
use App\Models\Mr;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentEditTest extends TestCase
{
    use RefreshDatabase;

    private $country;
    private $agency;
    private $mr;
    private $patient;
    private $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup reference data
        $this->country = Country::create(['name' => 'Bangladesh', 'code' => 'BD']);
        $this->agency = Agency::create(['name' => 'Test Agency', 'code' => 'TA']);
        $this->mr = Mr::create(['name' => 'Test MR', 'code' => 'TMR']);

        // Create Admin user (holds the global site settings)
        $this->adminUser = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'username' => 'admin',
            'password' => bcrypt('password'),
            'role' => 'Admin',
            'payment_edit_window_minutes' => 10, // 10 minutes limit
        ]);

        // Create standard Patient
        $this->patient = Patient::create([
            'date' => date('Y-m-d'),
            'pax_id' => 'BEST000001',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'country_id' => $this->country->id,
            'nationality' => 'BANGLADESH',
            'agency_id' => $this->agency->id,
            'mr_id' => $this->mr->id,
            'medical_fee' => 3500.00,
            'received_amount' => 1000.00,
            'due_amount' => 2500.00,
            'niddle_charge' => 10.00,
            'in_words' => 'Three Thousand Five Hundred',
        ]);
    }

    /**
     * Helper to get common request payload for updating patient.
     */
    private function getUpdatePayload(array $overrides = []): array
    {
        return array_merge([
            'date' => date('Y-m-d'),
            'country_id' => $this->country->id,
            'nationality' => 'BANGLADESH',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'agency_id' => $this->agency->id,
            'mr_id' => $this->mr->id,
            'medical_fee' => 3500.00,
            'received_amount' => 1000.00,
            'niddle_charge' => 10.00,
            'in_words' => 'Three Thousand Five Hundred',
        ], $overrides);
    }

    public function test_super_admin_can_always_edit_payment_information(): void
    {
        // Act as Super Admin (Admin role)
        $this->actingAs($this->adminUser, 'api');

        $response = $this->putJson("/api/patients/{$this->patient->id}", $this->getUpdatePayload([
            'medical_fee' => 4000.00, // Changed
        ]));

        $response->assertStatus(200);
        $this->assertDatabaseHas('patients', [
            'id' => $this->patient->id,
            'medical_fee' => 4000.00,
        ]);
    }

    public function test_user_without_edit_payment_permission_is_denied(): void
    {
        // Create a role without edit_payment
        $role = Role::create([
            'name' => 'Front Desk',
            'permissions' => ['view_database'],
        ]);

        $user = User::create([
            'name' => 'Staff User',
            'email' => 'staff@test.com',
            'username' => 'staff',
            'password' => bcrypt('password'),
            'role' => 'MR',
            'role_id' => $role->id,
        ]);

        $this->actingAs($user, 'api');

        // Try to change medical fee
        $response = $this->putJson("/api/patients/{$this->patient->id}", $this->getUpdatePayload([
            'medical_fee' => 4000.00,
        ]));

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'error' => 'You do not have permission to edit payment fields.',
        ]);
    }

    public function test_user_with_edit_payment_permission_allowed_within_time_limit(): void
    {
        // Create a role with edit_payment
        $role = Role::create([
            'name' => 'Accountant',
            'permissions' => ['edit_payment'],
        ]);

        $user = User::create([
            'name' => 'Staff User',
            'email' => 'staff@test.com',
            'username' => 'staff',
            'password' => bcrypt('password'),
            'role' => 'MR',
            'role_id' => $role->id,
        ]);

        $this->actingAs($user, 'api');

        // Set creation time to 5 minutes ago (within 10 minutes limit)
        $this->patient->created_at = now()->subMinutes(5);
        $this->patient->save();

        $response = $this->putJson("/api/patients/{$this->patient->id}", $this->getUpdatePayload([
            'medical_fee' => 4000.00,
        ]));

        $response->assertStatus(200);
        $this->assertDatabaseHas('patients', [
            'id' => $this->patient->id,
            'medical_fee' => 4000.00,
        ]);
    }

    public function test_user_with_edit_payment_permission_denied_after_time_limit(): void
    {
        // Create a role with edit_payment
        $role = Role::create([
            'name' => 'Accountant',
            'permissions' => ['edit_payment'],
        ]);

        $user = User::create([
            'name' => 'Staff User',
            'email' => 'staff@test.com',
            'username' => 'staff',
            'password' => bcrypt('password'),
            'role' => 'MR',
            'role_id' => $role->id,
        ]);

        $this->actingAs($user, 'api');

        // Set creation time to 15 minutes ago (limit is 10 minutes)
        $this->patient->created_at = now()->subMinutes(15);
        $this->patient->save();

        $response = $this->putJson("/api/patients/{$this->patient->id}", $this->getUpdatePayload([
            'medical_fee' => 4000.00,
        ]));

        $response->assertStatus(403);
        $response->assertJsonFragment([
            'error' => 'The payment edit time limit has expired for this entry.',
        ]);
    }

    public function test_user_without_edit_payment_permission_can_edit_non_payment_fields(): void
    {
        // Create a role without edit_payment
        $role = Role::create([
            'name' => 'Front Desk',
            'permissions' => ['view_database'],
        ]);

        $user = User::create([
            'name' => 'Staff User',
            'email' => 'staff@test.com',
            'username' => 'staff',
            'password' => bcrypt('password'),
            'role' => 'MR',
            'role_id' => $role->id,
        ]);

        $this->actingAs($user, 'api');

        // Modify non-payment field first_name, keeping payment fields unchanged
        $response = $this->putJson("/api/patients/{$this->patient->id}", $this->getUpdatePayload([
            'first_name' => 'Johnny',
        ]));

        $response->assertStatus(200);
        $this->assertDatabaseHas('patients', [
            'id' => $this->patient->id,
            'first_name' => 'Johnny',
            'medical_fee' => 3500.00, // Unchanged
        ]);
    }
}
