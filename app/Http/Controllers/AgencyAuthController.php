<?php

namespace App\Http\Controllers;

use App\Traits\StoresPublicUploads;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException;

/**
 * Agency Portal login — a separate JWT guard ("agency", see config/auth.php) from staff ("api"),
 * so an agency token can never be used against the staff-only endpoints and vice versa.
 */
class AgencyAuthController extends Controller
{
    use StoresPublicUploads;

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $credentials = ['username' => $request->username, 'password' => $request->password];

        if (! $token = Auth::guard('agency')->attempt($credentials)) {
            return response()->json(['error' => 'Unauthorized: Invalid credentials'], 401);
        }

        $agency = Auth::guard('agency')->user();
        if ($agency->status !== '1') {
            Auth::guard('agency')->logout();
            return response()->json(['error' => 'This agency account is inactive'], 403);
        }

        $agency->forceFill(['portal_last_login_at' => now()])->save();

        return $this->respondWithToken($token);
    }

    public function me()
    {
        return response()->json(Auth::guard('agency')->user());
    }

    public function logout()
    {
        Auth::guard('agency')->logout();
        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * Not behind auth:agency on purpose — mirrors AuthController::refresh(), see its comment.
     */
    public function refresh()
    {
        $guard = Auth::guard('agency');

        try {
            $oldToken = (string) $guard->getToken();
            $newToken = $guard->refresh();
            $agency = $guard->setToken($newToken)->user();
        } catch (JWTException $e) {
            return response()->json(['error' => 'Session expired, please log in again'], 401);
        }

        if (! $agency || $agency->status !== '1') {
            $guard->invalidate();
            return response()->json(['error' => 'This agency account is inactive'], 403);
        }

        // A password change ends every older session — same reasoning as AuthController::refresh().
        $issuedAt = json_decode(base64_decode(strtr(explode('.', $oldToken)[1] ?? '', '-_', '+/')), true)['iat'] ?? null;
        if ($agency->portal_password_changed_at && $issuedAt !== null && $issuedAt < $agency->portal_password_changed_at->getTimestamp()) {
            $guard->invalidate();
            return response()->json(['error' => 'Your password was changed, please log in again'], 401);
        }

        return $this->respondWithToken($newToken);
    }

    /**
     * PUT /api/agency/profile — the agency's own contact details. Explicit whitelist: never
     * username/password/status/price through this endpoint, only what the agency should touch.
     */
    public function updateProfile(Request $request)
    {
        $agency = Auth::guard('agency')->user();

        $validator = Validator::make($request->all(), [
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'mobile_no' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $updates = $validator->validated();
        unset($updates['logo']);

        if ($request->hasFile('logo')) {
            $updates['logo_path'] = $this->storePublicUpload($request->file('logo'), 'agencies', 'logo');
        }

        $agency->update($updates);

        return response()->json([
            'message' => 'Profile updated successfully',
            'agency'  => $agency->fresh(),
        ]);
    }

    /**
     * PUT /api/agency/password
     */
    public function changePassword(Request $request)
    {
        $agency = Auth::guard('agency')->user();

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        if (! Hash::check($request->current_password, $agency->password)) {
            return response()->json(['error' => 'Current password is incorrect'], 422);
        }

        $agency->forceFill([
            'password' => $request->new_password,
            'portal_password_changed_at' => now(),
        ])->save();

        return response()->json(['message' => 'Password updated successfully']);
    }

    protected function respondWithToken($token)
    {
        return response()->json([
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => Auth::guard('agency')->factory()->getTTL() * 60,
            'agency'       => Auth::guard('agency')->user(),
        ]);
    }
}
