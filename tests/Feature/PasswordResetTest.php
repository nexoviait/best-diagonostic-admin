<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

/**
 * Forgot-password by e-mail code (Brevo) and the admin-managed settings behind it.
 */
class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private User $staff;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'username' => 'admin',
            'password' => 'admin-password',
            'role' => 'Admin',
        ]);

        $this->staff = User::create([
            'name' => 'Staff Member',
            'email' => 'staff@test.com',
            'username' => 'staff',
            'password' => 'old-password',
            'role' => 'MR',
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function configureBrevo(): void
    {
        AppSetting::put('brevo_api_key', 'xkeysib-test-1234');
        AppSetting::put('mail_sender_email', 'no-reply@bestdiagnostic.com.bd');
        AppSetting::put('mail_sender_name', 'BEST Diagnostic');
    }

    /** Http::fake() keeps earlier stubs and recorded requests; start over when a test needs a clean slate. */
    private function freshHttp(array $stubs = []): void
    {
        Http::swap(new HttpFactory());
        Http::fake($stubs);
    }

    /** Ask for a code and return the one that was e-mailed. */
    private function requestCode(string $login = 'staff'): string
    {
        Http::fake(['api.brevo.com/*' => Http::response(['messageId' => 'abc'], 201)]);

        $this->postJson('/api/auth/forgot-password', ['login' => $login])->assertOk();

        $code = null;
        Http::assertSent(function ($request) use (&$code) {
            preg_match('/>(\d{6})</', $request['htmlContent'], $m);
            $code = $m[1] ?? null;

            return $code !== null;
        });

        return $code;
    }

    // ─── Forgot / reset flow ────────────────────────────────────────────────

    public function test_forgot_password_says_so_when_email_is_not_configured(): void
    {
        $this->postJson('/api/auth/forgot-password', ['login' => 'staff'])
            ->assertStatus(503)
            ->assertJsonPath('error', fn ($m) => str_contains($m, 'not set up'));
    }

    public function test_code_is_sent_through_brevo_and_resets_the_password(): void
    {
        $this->configureBrevo();
        $code = $this->requestCode('staff@test.com'); // e-mail works as the login too

        Http::assertSent(fn ($request) => $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && $request->hasHeader('api-key', 'xkeysib-test-1234')
            && $request['to'][0]['email'] === 'staff@test.com'
            && $request['sender']['email'] === 'no-reply@bestdiagnostic.com.bd');

        // Only a hash of the code is stored.
        $this->assertDatabaseMissing('password_reset_codes', ['code_hash' => $code]);

        $this->postJson('/api/auth/reset-password', [
            'login' => 'staff',
            'code' => $code,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->postJson('/api/auth/login', ['login' => 'staff', 'password' => 'new-password'])->assertOk();
        $this->postJson('/api/auth/login', ['login' => 'staff', 'password' => 'old-password'])->assertStatus(401);
        $this->assertDatabaseCount('password_reset_codes', 0); // one-time use
    }

    public function test_unknown_and_inactive_accounts_get_the_same_answer_and_no_email(): void
    {
        $this->configureBrevo();
        $this->staff->update(['status' => '0']);
        Http::fake();

        $known = $this->postJson('/api/auth/forgot-password', ['login' => 'staff']);
        $unknown = $this->postJson('/api/auth/forgot-password', ['login' => 'nobody']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json(), $unknown->json());
        Http::assertNothingSent();
    }

    public function test_wrong_code_is_rejected_and_locks_after_five_attempts(): void
    {
        $this->configureBrevo();
        $code = $this->requestCode();
        $wrong = $code === '111111' ? '222222' : '111111';

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/reset-password', [
                'login' => 'staff', 'code' => $wrong,
                'password' => 'new-password', 'password_confirmation' => 'new-password',
            ])->assertStatus(422);
        }

        // Even the right code no longer works: the user must request a new one.
        $this->postJson('/api/auth/reset-password', [
            'login' => 'staff', 'code' => $code,
            'password' => 'new-password', 'password_confirmation' => 'new-password',
        ])->assertStatus(422);

        $this->postJson('/api/auth/login', ['login' => 'staff', 'password' => 'old-password'])->assertOk();
    }

    public function test_expired_code_is_rejected(): void
    {
        $this->configureBrevo();
        $code = $this->requestCode();

        Carbon::setTestNow(now()->addMinutes(16));

        $this->postJson('/api/auth/reset-password', [
            'login' => 'staff', 'code' => $code,
            'password' => 'new-password', 'password_confirmation' => 'new-password',
        ])->assertStatus(422);
    }

    public function test_password_rules_are_enforced(): void
    {
        $this->configureBrevo();
        $code = $this->requestCode();

        $this->postJson('/api/auth/reset-password', [
            'login' => 'staff', 'code' => $code,
            'password' => 'abc', 'password_confirmation' => 'abc',
        ])->assertStatus(422)->assertJsonStructure(['password']);

        $this->postJson('/api/auth/reset-password', [
            'login' => 'staff', 'code' => $code,
            'password' => 'new-password', 'password_confirmation' => 'different',
        ])->assertStatus(422)->assertJsonStructure(['password']);
    }

    public function test_a_failed_brevo_call_does_not_reveal_the_account_and_drops_the_code(): void
    {
        $this->configureBrevo();
        Http::fake(['api.brevo.com/*' => Http::response(['message' => 'Sender not verified'], 400)]);

        $this->postJson('/api/auth/forgot-password', ['login' => 'staff'])->assertOk();

        $this->assertDatabaseCount('password_reset_codes', 0);
    }

    public function test_asking_again_within_a_minute_does_not_issue_a_second_code(): void
    {
        $this->configureBrevo();
        $code = $this->requestCode();
        $before = DB::table('password_reset_codes')->first();

        $this->postJson('/api/auth/forgot-password', ['login' => 'staff'])->assertOk();

        // Same row, same code: the first e-mail is still the valid one.
        $after = DB::table('password_reset_codes')->get();
        $this->assertCount(1, $after);
        $this->assertSame($before->id, $after[0]->id);
        $this->assertSame($before->code_hash, $after[0]->code_hash);
        $this->assertNotEmpty($code);
    }

    public function test_forgot_password_is_rate_limited(): void
    {
        $this->configureBrevo();
        Http::fake();
        RateLimiter::clear('password-reset');

        $this->postJson('/api/auth/forgot-password', ['login' => 'a'])->assertOk();
        $this->postJson('/api/auth/forgot-password', ['login' => 'b'])->assertOk();
        $this->postJson('/api/auth/forgot-password', ['login' => 'c'])->assertStatus(429);
    }

    public function test_reset_ends_older_sessions(): void
    {
        $this->configureBrevo();
        $oldToken = JWTAuth::fromUser($this->staff); // e.g. on a phone that was lost

        Carbon::setTestNow(now()->addMinutes(2));
        $code = $this->requestCode();
        $this->postJson('/api/auth/reset-password', [
            'login' => 'staff', 'code' => $code,
            'password' => 'new-password', 'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->withHeader('Authorization', 'Bearer ' . $oldToken)
            ->postJson('/api/auth/refresh')
            ->assertStatus(401);

        // A fresh login after the reset still refreshes normally.
        $fresh = $this->postJson('/api/auth/login', ['login' => 'staff', 'password' => 'new-password'])
            ->json('access_token');
        $this->withHeader('Authorization', 'Bearer ' . $fresh)->postJson('/api/auth/refresh')->assertOk();
    }

    // ─── Settings managed from the web admin ────────────────────────────────

    public function test_only_admins_can_read_or_change_the_settings(): void
    {
        $this->actingAs($this->staff, 'api');

        $this->getJson('/api/app-settings')->assertStatus(403);
        $this->putJson('/api/app-settings', ['it_helpdesk_phone' => '01700000000'])->assertStatus(403);
        $this->postJson('/api/app-settings/test-email')->assertStatus(403);
    }

    public function test_api_key_is_stored_encrypted_and_never_returned(): void
    {
        $this->actingAs($this->admin, 'api');

        $response = $this->putJson('/api/app-settings', [
            'brevo_api_key' => 'xkeysib-secret-9876',
            'mail_sender_email' => 'no-reply@bestdiagnostic.com.bd',
            'mail_sender_name' => 'BEST Diagnostic',
            'it_helpdesk_phone' => '+880 1700-000000',
            'it_helpdesk_email' => 'it@bestdiagnostic.com.bd',
        ])->assertOk()
            ->assertJson([
                'brevo_api_key_set' => true,
                'brevo_api_key_hint' => '••••9876',
                'it_helpdesk_phone' => '+880 1700-000000',
            ]);

        $this->assertStringNotContainsString('xkeysib-secret', $response->getContent());
        $this->assertStringNotContainsString('xkeysib-secret', $this->getJson('/api/app-settings')->getContent());
        $this->assertNotSame('xkeysib-secret-9876', DB::table('app_settings')->where('key', 'brevo_api_key')->value('value'));
        $this->assertSame('xkeysib-secret-9876', AppSetting::get('brevo_api_key'));
    }

    public function test_leaving_the_key_blank_keeps_it_and_the_clear_flag_removes_it(): void
    {
        $this->actingAs($this->admin, 'api');
        $this->putJson('/api/app-settings', ['brevo_api_key' => 'xkeysib-keep-me'])->assertOk();

        $this->putJson('/api/app-settings', ['brevo_api_key' => '', 'it_helpdesk_phone' => '01711111111'])
            ->assertOk()
            ->assertJson(['brevo_api_key_set' => true]);

        $this->putJson('/api/app-settings', ['clear_brevo_api_key' => true])
            ->assertOk()
            ->assertJson(['brevo_api_key_set' => false]);
    }

    public function test_settings_are_validated(): void
    {
        $this->actingAs($this->admin, 'api');

        $this->putJson('/api/app-settings', ['mail_sender_email' => 'not-an-email', 'it_helpdesk_email' => 'nope'])
            ->assertStatus(422)
            ->assertJsonStructure(['mail_sender_email', 'it_helpdesk_email']);
    }

    public function test_test_email_uses_brevo_and_reports_failures(): void
    {
        $this->actingAs($this->admin, 'api');

        $this->postJson('/api/app-settings/test-email')->assertStatus(422); // nothing saved yet

        $this->configureBrevo();
        Http::fake(['api.brevo.com/*' => Http::response(['messageId' => 'x'], 201)]);
        $this->postJson('/api/app-settings/test-email')->assertOk();
        Http::assertSent(fn ($request) => $request['to'][0]['email'] === 'admin@test.com');

        $this->freshHttp(['api.brevo.com/*' => Http::response(['message' => 'Key not valid'], 401)]);
        $this->postJson('/api/app-settings/test-email')
            ->assertStatus(502)
            ->assertJsonPath('error', fn ($m) => str_contains($m, 'Key not valid') && !str_contains($m, 'xkeysib'));
    }

    public function test_helpdesk_contact_is_public_but_the_api_key_is_not(): void
    {
        $this->configureBrevo();
        AppSetting::put('it_helpdesk_phone', '+880 1700-000000');
        AppSetting::put('it_helpdesk_email', 'it@bestdiagnostic.com.bd');

        $response = $this->getJson('/api/public/site-settings')
            ->assertOk()
            ->assertJson([
                'it_helpdesk_phone' => '+880 1700-000000',
                'it_helpdesk_email' => 'it@bestdiagnostic.com.bd',
            ]);

        $this->assertStringNotContainsString('xkeysib', $response->getContent());
        $this->assertStringNotContainsString('brevo', strtolower($response->getContent()));
    }
}
