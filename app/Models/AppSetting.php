<?php

namespace App\Models;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class AppSetting extends Model
{
    /** Keys whose value is encrypted at rest and never sent back to the browser. */
    public const SECRET_KEYS = ['brevo_api_key'];

    protected $fillable = ['key', 'value'];

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = static::where('key', $key)->value('value');
        if ($value === null || $value === '') {
            return $default;
        }

        if (in_array($key, self::SECRET_KEYS, true)) {
            try {
                return Crypt::decryptString($value);
            } catch (DecryptException $e) {
                return $default; // APP_KEY changed: treat the secret as not set
            }
        }

        return $value;
    }

    public static function put(string $key, ?string $value): void
    {
        $stored = $value;
        if ($value !== null && $value !== '' && in_array($key, self::SECRET_KEYS, true)) {
            $stored = Crypt::encryptString($value);
        }

        static::updateOrCreate(['key' => $key], ['value' => $stored === '' ? null : $stored]);
    }
}
