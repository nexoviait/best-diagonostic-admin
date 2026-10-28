<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Sends transactional e-mail through the Brevo HTTP API (https://developers.brevo.com).
 * The API key and the verified sender address are managed from the web admin (Site Settings).
 */
class BrevoMailer
{
    private const ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

    public function isConfigured(): bool
    {
        return filled(AppSetting::get('brevo_api_key')) && filled(AppSetting::get('mail_sender_email'));
    }

    /**
     * @throws RuntimeException when Brevo is not configured or rejects the message
     */
    public function send(string $toEmail, ?string $toName, string $subject, string $html): void
    {
        $apiKey = AppSetting::get('brevo_api_key');
        $senderEmail = AppSetting::get('mail_sender_email');
        if (!filled($apiKey) || !filled($senderEmail)) {
            throw new RuntimeException('E-mail sending is not configured.');
        }

        $response = Http::withHeaders(['api-key' => $apiKey, 'accept' => 'application/json'])
            ->timeout(15)
            ->post(self::ENDPOINT, [
                'sender' => [
                    'name' => AppSetting::get('mail_sender_name', 'BEST Diagnostic'),
                    'email' => $senderEmail,
                ],
                'to' => [['email' => $toEmail, 'name' => $toName ?: $toEmail]],
                'subject' => $subject,
                'htmlContent' => $html,
            ]);

        if ($response->failed()) {
            // Never include the request (it carries the API key), only what Brevo answered.
            throw new RuntimeException(
                'Brevo rejected the e-mail (HTTP ' . $response->status() . '): ' . ($response->json('message') ?: 'no details')
            );
        }
    }
}
