<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Staff/app login: per account + IP, so one busy front desk sharing an IP
        // isn't locked out by somebody else's typos.
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by(strtolower((string) $request->input('login')) . '|' . $request->ip());
        });

        // Agency Portal login: per account + IP, same shape as staff login above.
        RateLimiter::for('agency-login', function (Request $request) {
            return Limit::perMinute(5)->by(strtolower((string) $request->input('username')) . '|' . $request->ip());
        });

        // Public report lookups (passport/token search).
        RateLimiter::for('public-lookup', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        // "Forgot password": ask for a code / send a code back. Both are heavily limited.
        RateLimiter::for('password-reset', function (Request $request) {
            return [Limit::perMinute(2)->by($request->ip()), Limit::perHour(6)->by($request->ip())];
        });
        RateLimiter::for('password-reset-verify', function (Request $request) {
            return Limit::perMinutes(15, 10)->by($request->ip());
        });

        // Signed PDF downloads.
        RateLimiter::for('public-pdf', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Callback form: hard cap so it cannot be used to spam the front desk.
        RateLimiter::for('public-callback', function (Request $request) {
            return [
                Limit::perMinute(3)->by($request->ip()),
                Limit::perHour(10)->by($request->ip()),
            ];
        });
    }
}
