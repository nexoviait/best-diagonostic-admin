<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\CallbackRequest;
use App\Models\Country;
use App\Models\MedicalReport;
use App\Models\Mr;
use App\Models\Patient;
use App\Models\User;
use App\Models\XrayReport;
use App\Support\ReportStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\RateLimiter;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

/**
 * Backend pieces the mobile app depends on: limited public lookup, signed PDF link,
 * callback requests, rate limiting and paginated patient list.
 */
class MobileApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $country = Country::create(['name' => 'Saudi Arabia']);
        $agency = Agency::create(['name' => 'Test Agency']);
        $mr = Mr::create(['name' => 'Test MR']);

        $this->admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'username' => 'admin',
            'password' => bcrypt('password'),
            'role' => 'Admin',
        ]);

        $this->patient = Patient::create([
            'date' => '2026-09-14',
            'pax_id' => 'BEST000752',
            'first_name' => 'MD AL-AMIN',
            'last_name' => 'HOSSAIN',
            'country_id' => $country->id,
            'agency_id' => $agency->id,
            'mr_id' => $mr->id,
            'passport_no' => 'A04539821',
            'medical_fee' => 500,
            'received_amount' => 500,
            'due_amount' => 0,
        ]);

        MedicalReport::create([
            'patient_id' => $this->patient->id,
            'final_status' => 'Fit',
            'hiv' => 'Negative',
        ]);
    }

    // ─── Overall status rule ────────────────────────────────────────────────

    public function test_overall_status_is_worst_of_report_and_xray(): void
    {
        $this->assertSame('Fit', ReportStatus::combine('Fit', null));
        $this->assertSame('Fit', ReportStatus::combine('Fit', 'Normal'));
        $this->assertSame('Held up', ReportStatus::combine('Fit', 'Held up'));
        $this->assertSame('Held up', ReportStatus::combine('Pending', 'Fit'));
        $this->assertSame('Unfit', ReportStatus::combine('Fit', 'Abnormal'));
        $this->assertSame('Unfit', ReportStatus::combine('Held up', 'Unfit'));
        $this->assertSame('Held up', ReportStatus::combine('', ''));
    }

    // ─── Public lookup ──────────────────────────────────────────────────────

    public function test_public_search_returns_only_limited_fields(): void
    {
        $response = $this->getJson('/api/public/certificate/search?passport_no=A04539821');

        $response->assertOk()
            ->assertJson([
                'token' => 'BEST000752',
                'name' => 'MD AL-AMIN HOSSAIN',
                'passport_no' => 'A04539821',
                'country' => 'Saudi Arabia',
                'status' => 'Fit',
            ])
            ->assertJsonStructure(['pdf_url', 'pdf_expires_at', 'expiry_date', 'is_expired']);

        // No medical details, money or images may leak through the public lookup.
        $body = json_encode($response->json());
        foreach (['hiv', 'medical_report', 'medical_fee', 'due_amount', 'image_url', 'fingerprint'] as $forbidden) {
            $this->assertStringNotContainsString($forbidden, $body);
        }
    }

    public function test_public_search_status_reflects_xray(): void
    {
        XrayReport::create([
            'patient_id' => $this->patient->id,
            'result' => 'Unfit',
        ]);

        $this->getJson('/api/public/certificate/search?passport_no=A04539821')
            ->assertOk()
            ->assertJson(['status' => 'Unfit']);
    }

    public function test_public_search_requires_passport_by_default(): void
    {
        $this->getJson('/api/public/certificate/search')->assertStatus(422);
        $this->getJson('/api/public/certificate/search?token=BEST000752')->assertStatus(422);
    }

    public function test_token_only_search_works_when_explicitly_enabled(): void
    {
        config(['certificate.allow_token_only_search' => true]);

        $this->getJson('/api/public/certificate/search?token=BEST000752')
            ->assertOk()
            ->assertJson(['name' => 'MD AL-AMIN HOSSAIN']);
    }

    public function test_token_must_match_passport_when_both_given(): void
    {
        $this->getJson('/api/public/certificate/search?passport_no=A04539821&token=BEST000752')->assertOk();
        $this->getJson('/api/public/certificate/search?passport_no=A04539821&token=BEST999999')->assertStatus(404);
        $this->getJson('/api/public/certificate/search?passport_no=ZZ0000000')->assertStatus(404);
    }

    public function test_public_search_is_rate_limited(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $this->getJson('/api/public/certificate/search?passport_no=NOPE' . $i)->assertStatus(404);
        }

        $this->getJson('/api/public/certificate/search?passport_no=NOPE')->assertStatus(429);
    }

    // ─── PDF ────────────────────────────────────────────────────────────────

    public function test_pdf_requires_a_signed_link(): void
    {
        $this->get('/api/public/certificate/BEST000752/pdf')->assertStatus(403);
    }

    public function test_pdf_is_generated_from_the_signed_link(): void
    {
        $url = $this->getJson('/api/public/certificate/search?passport_no=A04539821')->json('pdf_url');
        $this->assertNotEmpty($url);

        // pdf_url is absolute (APP_URL + relative signed path); call it as a relative path.
        $path = parse_url($url, PHP_URL_PATH) . '?' . parse_url($url, PHP_URL_QUERY);

        $response = $this->get($path);

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
        $this->assertStringContainsString('Medical-Certificate-BEST000752.pdf', $response->headers->get('content-disposition'));
    }

    public function test_tampered_pdf_link_is_rejected(): void
    {
        $url = $this->getJson('/api/public/certificate/search?passport_no=A04539821')->json('pdf_url');
        $path = parse_url($url, PHP_URL_PATH) . '?' . parse_url($url, PHP_URL_QUERY);

        // Same signature, different patient.
        $this->get(str_replace('BEST000752', 'BEST000001', $path))->assertStatus(403);
    }

    // ─── Callback requests ──────────────────────────────────────────────────

    public function test_callback_request_can_be_submitted_publicly(): void
    {
        $this->postJson('/api/public/callback-requests', [
            'name' => 'Md Rahman',
            'mobile' => '01712345678',
            'reason' => 'Online Report Status',
        ])->assertStatus(201);

        $this->assertDatabaseHas('callback_requests', [
            'name' => 'Md Rahman',
            'mobile' => '01712345678',
            'status' => 'pending',
        ]);
    }

    public function test_callback_request_is_validated(): void
    {
        $this->postJson('/api/public/callback-requests', ['name' => '', 'mobile' => 'abc'])
            ->assertStatus(422)
            ->assertJsonStructure(['name', 'mobile']); // flat error object, same style as the rest of the API
    }

    public function test_callback_request_is_rate_limited(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/public/callback-requests', ['name' => 'A', 'mobile' => '01712345678'])->assertStatus(201);
        }

        $this->postJson('/api/public/callback-requests', ['name' => 'A', 'mobile' => '01712345678'])->assertStatus(429);
    }

    public function test_staff_can_list_and_update_callback_requests(): void
    {
        $cb = CallbackRequest::create(['name' => 'Md Rahman', 'mobile' => '01712345678']);

        // Not logged in
        $this->getJson('/api/callback-requests')->assertStatus(401);

        $this->actingAs($this->admin, 'api');

        $this->getJson('/api/callback-requests')->assertOk()->assertJsonPath('data.0.name', 'Md Rahman');
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('pending_callbacks', 1);

        $this->patchJson("/api/callback-requests/{$cb->id}", ['status' => 'called'])
            ->assertOk()
            ->assertJsonPath('status', 'called');

        $this->assertDatabaseHas('callback_requests', ['id' => $cb->id, 'status' => 'called', 'handled_by' => $this->admin->id]);
        $this->patchJson("/api/callback-requests/{$cb->id}", ['status' => 'bogus'])->assertStatus(422);
    }

    // ─── Login rate limit / pagination ──────────────────────────────────────

    public function test_login_is_rate_limited_per_account(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['login' => 'admin', 'password' => 'wrong-password'])->assertStatus(401);
        }

        $this->postJson('/api/auth/login', ['login' => 'admin', 'password' => 'wrong-password'])->assertStatus(429);

        // A different account from the same IP is not locked out.
        $this->postJson('/api/auth/login', ['login' => 'someone-else', 'password' => 'wrong-password'])->assertStatus(401);
    }

    public function test_expired_token_can_still_be_refreshed_within_the_refresh_window(): void
    {
        // The app is often reopened hours after the 60 minute access token expired; it must be able
        // to swap the stale token for a fresh one instead of forcing a new login every time.
        $token = JWTAuth::fromUser($this->admin);

        Carbon::setTestNow(now()->addHours(3));

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/refresh')
            ->assertOk()
            ->assertJsonStructure(['access_token', 'expires_in', 'user'])
            ->assertJsonPath('user.id', $this->admin->id);

        Carbon::setTestNow();
    }

    public function test_refresh_without_a_token_is_rejected(): void
    {
        $this->postJson('/api/auth/refresh')->assertStatus(401);
    }

    public function test_deactivated_user_cannot_refresh(): void
    {
        $token = JWTAuth::fromUser($this->admin);
        $this->admin->update(['status' => '0']);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/refresh')
            ->assertStatus(403);
    }

    public function test_token_past_the_refresh_window_is_rejected(): void
    {
        $token = JWTAuth::fromUser($this->admin);

        Carbon::setTestNow(now()->addDays(15));

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/refresh')
            ->assertStatus(401);

        Carbon::setTestNow();
    }

    public function test_patients_list_is_paginated_only_when_asked(): void
    {
        $this->actingAs($this->admin, 'api');

        // Legacy behaviour: plain array
        $this->getJson('/api/patients')->assertOk()->assertJsonCount(1);

        // Mobile: paginator envelope
        $this->getJson('/api/patients?per_page=25&page=1')
            ->assertOk()
            ->assertJsonStructure(['data', 'current_page', 'last_page', 'total'])
            ->assertJsonPath('total', 1);
    }

    protected function tearDown(): void
    {
        RateLimiter::clear('login');
        parent::tearDown();
    }
}
