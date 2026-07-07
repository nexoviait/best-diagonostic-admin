<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restrict access to Admin-role users only.
 * Apply after auth:api middleware.
 */
class AdminOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Allow access if the user's role is explicitly 'Admin' (seeder/root user),
        // or if they have a custom role with 'manage_users' or 'manage_roles' permissions,
        // or if the custom role name is 'Admin' or 'Superadmin'.
        $permissions = $user->permissions ?? [];
        $roleName = $user->role_name ?? '';

        $isAuthorized = ($user->role === 'Admin') ||
                        in_array($roleName, ['Admin', 'Superadmin']) ||
                        in_array('manage_users', $permissions) ||
                        in_array('manage_roles', $permissions);

        if (!$isAuthorized) {
            return response()->json(['error' => 'Forbidden: Admin access required'], 403);
        }

        return $next($request);
    }
}
