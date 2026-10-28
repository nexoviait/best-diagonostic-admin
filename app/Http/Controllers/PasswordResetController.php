<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\BrevoMailer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

/**
 * "Forgot password" for staff, used by the mobile app.
 *
 *   1. forgot(): the user gives their username or e-mail; a 6-digit code is e-mailed (via Brevo).
 *   2. reset():  the user sends the code plus a new password.
 *
 * The response to forgot() is identical whether or not the account exists, so it cannot be used
 * to find out which usernames are valid.
 */
class PasswordResetController extends Controller
{
    private const CODE_TTL_MINUTES = 15;
    private const MAX_ATTEMPTS = 5;
    private const RESEND_COOLDOWN_SECONDS = 60;

    private function hashCode(string $code): string
    {
        return hash_hmac('sha256', $code, (string) config('app.key'));
    }

    private function findUser(string $login): ?User
    {
        $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        return User::where($field, $login)->first();
    }

    public function forgot(Request $request, BrevoMailer $mailer)
    {
        $validator = Validator::make($request->all(), ['login' => 'required|string|max:255']);
        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // Not account-specific, so it is safe to say out loud: nothing can be sent until an
        // administrator has entered the Brevo API key.
        if (!$mailer->isConfigured()) {
            return response()->json([
                'error' => 'Password reset by e-mail is not set up yet. Please contact your administrator.',
            ], 503);
        }

        $user = $this->findUser(trim($request->login));

        if ($user && $user->status === '1' && filled($user->email)) {
            $recent = DB::table('password_reset_codes')
                ->where('user_id', $user->id)
                ->where('created_at', '>', now()->subSeconds(self::RESEND_COOLDOWN_SECONDS))
                ->exists();

            if (!$recent) {
                $code = (string) random_int(100000, 999999);

                DB::table('password_reset_codes')->where('user_id', $user->id)->delete();
                $id = DB::table('password_reset_codes')->insertGetId([
                    'user_id' => $user->id,
                    'code_hash' => $this->hashCode($code),
                    'attempts' => 0,
                    'expires_at' => now()->addMinutes(self::CODE_TTL_MINUTES),
                    'created_at' => now(),
                ]);

                // Sent after the response, so answering takes the same time whether or not the
                // account exists (a slow reply would give the account away).
                $email = $user->email;
                $name = $user->name;
                $userId = $user->id;
                $body = $this->emailBody($name, $code);

                dispatch(function () use ($mailer, $email, $name, $body, $userId, $id) {
                    try {
                        $mailer->send($email, $name, 'BEST Diagnostic: your password reset code', $body);
                    } catch (RuntimeException $e) {
                        // The caller is not told (that would reveal the account); the admin sees it in the log.
                        Log::error('Password reset e-mail failed for user ' . $userId . ': ' . $e->getMessage());
                        DB::table('password_reset_codes')->where('id', $id)->delete();
                    }
                })->afterResponse();
            }
        }

        return response()->json([
            'message' => 'If an account matches, a 6-digit code has been sent to its e-mail address. It is valid for '
                . self::CODE_TTL_MINUTES . ' minutes.',
        ]);
    }

    public function reset(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login' => 'required|string|max:255',
            'code' => 'required|digits:6',
            'password' => 'required|string|min:6|max:255|confirmed',
        ]);
        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $invalid = response()->json(['error' => 'The code is wrong or has expired. Request a new one.'], 422);

        $user = $this->findUser(trim($request->login));
        if (!$user || $user->status !== '1') {
            return $invalid;
        }

        $row = DB::table('password_reset_codes')->where('user_id', $user->id)->first();
        if (!$row || now()->greaterThan($row->expires_at) || $row->attempts >= self::MAX_ATTEMPTS) {
            return $invalid;
        }

        if (!hash_equals($row->code_hash, $this->hashCode((string) $request->code))) {
            DB::table('password_reset_codes')->where('id', $row->id)->increment('attempts');

            return $invalid;
        }

        $user->forceFill([
            'password' => $request->password, // hashed by the model cast
            'password_changed_at' => now(),
        ])->save();

        DB::table('password_reset_codes')->where('user_id', $user->id)->delete();

        return response()->json(['message' => 'Your password has been changed. You can sign in now.']);
    }

    private function emailBody(string $name, string $code): string
    {
        $name = e($name);

        return <<<HTML
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; color: #0f172a;">
  <h2 style="color: #0a8a4b;">BEST Diagnostic</h2>
  <p>Hello {$name},</p>
  <p>Use this code to reset your password:</p>
  <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 24px 0;">{$code}</p>
  <p>The code is valid for 15 minutes. If you did not ask for it, you can ignore this e-mail; your password stays the same.</p>
</div>
HTML;
    }
}
