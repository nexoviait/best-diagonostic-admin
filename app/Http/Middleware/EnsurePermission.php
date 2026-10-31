<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Generic permission gate: Route::middleware('permission:view_finance'). Same bypass rule as
 * AdminOnly — the legacy 'Admin' role and the 'Superadmin' custom role always pass, everyone
 * else needs the named permission in their role's permissions array.
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $permissions = $user->permissions ?? [];
        $roleName = $user->role_name ?? '';

        $isAuthorized = $user->role === 'Admin'
            || in_array($roleName, ['Admin', 'Superadmin'])
            || in_array($permission, $permissions);

        if (! $isAuthorized) {
            return response()->json(['error' => 'Forbidden: missing permission "' . $permission . '"'], 403);
        }

        return $next($request);
    }
}
