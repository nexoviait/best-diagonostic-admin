<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Services\BrevoMailer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

/**
 * E-mail provider (Brevo) and IT helpdesk settings, edited from Site Settings in the web admin.
 * Same access rule as the rest of that page: Admin / Superadmin or the manage_settings permission.
 */
class AppSettingsController extends Controller
{
    private function deny(): ?\Illuminate\Http\JsonResponse
    {
        $user = Auth::guard('api')->user();
        $allowed = $user && (
            $user->role === 'Admin'
            || in_array($user->role_name, ['Admin', 'Superadmin'], true)
            || in_array('manage_settings', $user->permissions ?? [], true)
        );

        return $allowed ? null : response()->json(['error' => 'You do not have permission to change these settings.'], 403);
    }

    public function show()
    {
        if ($denied = $this->deny()) {
            return $denied;
        }

        $key = AppSetting::get('brevo_api_key');

        return response()->json([
            // The key itself is never sent back; only whether one is stored and its last 4 characters.
            'brevo_api_key_set' => filled($key),
            'brevo_api_key_hint' => filled($key) ? '••••' . substr($key, -4) : null,
            'mail_sender_email' => AppSetting::get('mail_sender_email'),
            'mail_sender_name' => AppSetting::get('mail_sender_name'),
            'it_helpdesk_phone' => AppSetting::get('it_helpdesk_phone'),
            'it_helpdesk_email' => AppSetting::get('it_helpdesk_email'),
        ]);
    }

    public function update(Request $request)
    {
        if ($denied = $this->deny()) {
            return $denied;
        }

        $validator = Validator::make($request->all(), [
            'brevo_api_key' => 'nullable|string|max:255',
            'clear_brevo_api_key' => 'nullable|boolean',
            'mail_sender_email' => 'nullable|email|max:255',
            'mail_sender_name' => 'nullable|string|max:100',
            'it_helpdesk_phone' => 'nullable|string|max:50',
            'it_helpdesk_email' => 'nullable|email|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $data = $validator->validated();

        // An empty key field means "keep the stored one"; removing it takes an explicit flag.
        if (filled($data['brevo_api_key'] ?? null)) {
            AppSetting::put('brevo_api_key', trim($data['brevo_api_key']));
        } elseif (!empty($data['clear_brevo_api_key'])) {
            AppSetting::put('brevo_api_key', null);
        }

        foreach (['mail_sender_email', 'mail_sender_name', 'it_helpdesk_phone', 'it_helpdesk_email'] as $field) {
            if (array_key_exists($field, $data)) {
                AppSetting::put($field, filled($data[$field]) ? trim($data[$field]) : null);
            }
        }

        return $this->show();
    }

    /**
     * Send a test e-mail so the admin can confirm the key and sender address work before
     * staff depend on it for password resets.
     */
    public function testEmail(Request $request, BrevoMailer $mailer)
    {
        if ($denied = $this->deny()) {
            return $denied;
        }

        $validator = Validator::make($request->all(), ['to' => 'nullable|email|max:255']);
        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $user = Auth::guard('api')->user();
        $to = $request->input('to') ?: $user->email;

        if (!$mailer->isConfigured()) {
            return response()->json(['error' => 'Save the Brevo API key and the sender e-mail first.'], 422);
        }

        try {
            $mailer->send(
                $to,
                $user->name,
                'BEST Diagnostic: test e-mail',
                '<p>This is a test e-mail from the BEST Diagnostic admin panel. E-mail sending is working.</p>'
            );
        } catch (RuntimeException $e) {
            Log::warning('Test e-mail failed: ' . $e->getMessage());

            return response()->json(['error' => $e->getMessage()], 502);
        }

        return response()->json(['message' => 'Test e-mail sent to ' . $to . '.']);
    }
}
