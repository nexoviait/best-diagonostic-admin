<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Get a JWT via given credentials.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login'    => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // Support login by email or username
        $loginField  = filter_var($request->login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';
        $credentials = [$loginField => $request->login, 'password' => $request->password];

        if (! $token = Auth::guard('api')->attempt($credentials)) {
            return response()->json(['error' => 'Unauthorized: Invalid credentials'], 401);
        }

        $user = Auth::guard('api')->user();
        if ($user->status !== '1') {
            Auth::guard('api')->logout();
            return response()->json(['error' => 'Account is inactive'], 403);
        }

        return $this->respondWithToken($token);
    }

    /**
     * Register a new user (Admin only — secured by route middleware).
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'     => 'required|string|between:2,100',
            'email'    => 'required|string|email|max:100|unique:users',
            'username' => 'required|string|max:50|unique:users',
            'password' => 'required|string|min:6|confirmed',
            'role'     => 'string|in:Admin,MR',
            'mobile_no'=> 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'username'  => $request->username,
            'password'  => Hash::make($request->password),
            'role'      => $request->role ?? 'MR',
            'mobile_no' => $request->mobile_no,
            'status'    => '1',
        ]);

        return response()->json([
            'message' => 'User successfully registered',
            'user'    => $user,
        ], 201);
    }

    /**
     * Get the authenticated User.
     */
    public function me()
    {
        return response()->json(Auth::guard('api')->user());
    }

    /**
     * Log the user out (Invalidate the token).
     */
    public function logout()
    {
        Auth::guard('api')->logout();
        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * Refresh a token.
     */
    public function refresh()
    {
        return $this->respondWithToken(Auth::guard('api')->refresh());
    }

    /**
     * Update own account profile.
     * SECURITY: uses explicit ->only() whitelist instead of raw except() to prevent mass-assignment.
     */
    public function updateProfile(Request $request)
    {
        /** @var User $user */
        $user = Auth::guard('api')->user();

        $validator = Validator::make($request->all(), [
            'name'                  => 'sometimes|string|max:255',
            'email'                 => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'username'              => 'sometimes|string|max:255|unique:users,username,' . $user->id,
            'mobile_no'             => 'nullable|string|max:20',
            'company_name_en'       => 'nullable|string|max:255',
            'company_name_en_title' => 'nullable|string|max:255',
            'company_address_en'    => 'nullable|string|max:500',
            'company_phone_en'      => 'nullable|string|max:50',
            'company_pax_en'        => 'nullable|string|max:100',
            'company_name_bn'       => 'nullable|string|max:255',
            'company_name_bn_title' => 'nullable|string|max:255',
            'company_address_bn'    => 'nullable|string|max:500',
            'company_phone_bn'      => 'nullable|string|max:50',
            'company_pax_bn'        => 'nullable|string|max:100',
            'role_id'               => 'nullable|exists:roles,id',
            'status'                => 'nullable|string|in:0,1',
            'logo_image'            => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:3072',
            'signature_physician'   => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'signature_radiologist' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'signature_authorised'  => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // SECURITY: explicit whitelist — never expose password or role escalation via this endpoint
        $allowedFields = [
            'name', 'email', 'username', 'mobile_no',
            'company_name_en', 'company_name_en_title', 'company_address_en', 'company_phone_en', 'company_pax_en',
            'company_name_bn', 'company_name_bn_title', 'company_address_bn', 'company_phone_bn', 'company_pax_bn',
            'status',
        ];
        $data = $validator->validated();
        $updates = array_intersect_key($data, array_flip($allowedFields));

        // Process file uploads — sanitize filenames to prevent path traversal
        $fileFields = [
            'logo_image'            => ['dest' => public_path('uploads/company'),     'column' => 'logo_path',                  'prefix' => 'logo'],
            'signature_physician'   => ['dest' => public_path('uploads/signatures'),  'column' => 'signature_physician_path',   'prefix' => 'physician'],
            'signature_radiologist' => ['dest' => public_path('uploads/signatures'),  'column' => 'signature_radiologist_path', 'prefix' => 'radiologist'],
            'signature_authorised'  => ['dest' => public_path('uploads/signatures'),  'column' => 'signature_authorised_path',  'prefix' => 'authorised'],
        ];

        foreach ($fileFields as $inputName => $config) {
            if ($request->hasFile($inputName)) {
                $file      = $request->file($inputName);
                $ext       = $file->getClientOriginalExtension();
                // SECURITY: sanitize filename — no original client filename, use prefix + timestamp + random string
                $safeName  = $config['prefix'] . '_' . time() . '_' . Str::random(8) . '.' . $ext;
                $dir       = $config['dest'];

                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }

                $file->move($dir, $safeName);

                $subDir = str_contains($dir, 'signatures') ? 'uploads/signatures/' : 'uploads/company/';
                $updates[$config['column']] = '/' . $subDir . $safeName;
            }
        }

        $user->update($updates);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Change Password.
     */
    public function changePassword(Request $request)
    {
        /** @var User $user */
        $user = Auth::guard('api')->user();

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'Current password is incorrect'], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json(['message' => 'Password updated successfully']);
    }

    /**
     * Get all users (Admin only — secured by route middleware).
     */
    public function index()
    {
        $currentUser = auth()->user();
        
        $isSuperAdmin = $currentUser && (
            $currentUser->role === 'Admin' || 
            ($currentUser->customRole && strtolower($currentUser->customRole->name) === 'superadmin') ||
            $currentUser->username === 'superadmin'
        );

        $query = User::with('customRole')
            ->select(['id', 'name', 'username', 'email', 'role', 'status', 'mobile_no', 'role_id', 'created_at'])
            ->orderBy('name');

        if (!$isSuperAdmin) {
            // Filter out any superadmins from the list
            $query->where(function($q) {
                $q->where('role', '!=', 'Admin')
                  ->orWhereNull('role');
            })
            ->where('username', '!=', 'superadmin')
            ->where(function($q) {
                $q->whereDoesntHave('customRole')
                  ->orWhereHas('customRole', function($sub) {
                      $sub->where('name', '!=', 'Superadmin')
                          ->where('name', '!=', 'superadmin');
                  });
            });
        }

        return response()->json($query->get());
    }

    /**
     * Create a new user (Admin only — secured by route middleware).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name'            => 'required|string|max:255',
            'username'        => 'required|string|max:255|unique:users',
            'email'           => 'required|string|email|max:255|unique:users',
            'password'        => 'required|string|min:6',
            'mobile_no'       => 'nullable|string|max:20',
            'role_id'         => 'nullable|exists:roles,id',
            'status'          => 'nullable|string|in:0,1',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $user = User::create([
            'name'            => $request->name,
            'username'        => $request->username,
            'email'           => $request->email,
            'password'        => Hash::make($request->password),
            'mobile_no'       => $request->mobile_no,
            'role_id'         => $request->role_id,
            'status'          => $request->status ?? '1',
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user'    => $user,
        ], 201);
    }

    /**
     * Update an existing user (Admin only — secured by route middleware).
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Check if the target user is a Super Admin
        $isTargetSuperAdmin = $user->role === 'Admin' ||
                              ($user->customRole && strtolower($user->customRole->name) === 'superadmin') ||
                              $user->username === 'superadmin';

        if ($isTargetSuperAdmin) {
            $currentUser = auth()->user();
            $isCurrentUserSuperAdmin = $currentUser && (
                $currentUser->role === 'Admin' || 
                ($currentUser->customRole && strtolower($currentUser->customRole->name) === 'superadmin') ||
                $currentUser->username === 'superadmin'
            );

            if (!$isCurrentUserSuperAdmin) {
                return response()->json(['error' => 'Forbidden: Only Super Admins can manage Super Admin accounts'], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'name'            => 'sometimes|string|max:255',
            'username'        => 'sometimes|string|max:255|unique:users,username,' . $user->id,
            'email'           => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'password'        => 'nullable|string|min:6',
            'mobile_no'       => 'nullable|string|max:20',
            'role_id'         => 'nullable|exists:roles,id',
            'status'          => 'nullable|string|in:0,1',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $data = $request->only(['name', 'username', 'email', 'mobile_no', 'role_id', 'status']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json([
            'message' => 'User updated successfully',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Delete a user (Admin only — secured by route middleware).
     */
    public function destroy($id)
    {
        /** @var User $user */
        $user = User::findOrFail($id);

        // Check if the target user is a Super Admin
        $isTargetSuperAdmin = $user->role === 'Admin' ||
                              ($user->customRole && strtolower($user->customRole->name) === 'superadmin') ||
                              $user->username === 'superadmin';

        if ($isTargetSuperAdmin) {
            $currentUser = auth()->user();
            $isCurrentUserSuperAdmin = $currentUser && (
                $currentUser->role === 'Admin' || 
                ($currentUser->customRole && strtolower($currentUser->customRole->name) === 'superadmin') ||
                $currentUser->username === 'superadmin'
            );

            if (!$isCurrentUserSuperAdmin) {
                return response()->json(['error' => 'Forbidden: Only Super Admins can delete Super Admin accounts'], 403);
            }
        }

        if ($user->id === Auth::guard('api')->id()) {
            return response()->json(['error' => 'You cannot delete yourself'], 422);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Get token array structure.
     */
    protected function respondWithToken($token)
    {
        return response()->json([
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => Auth::guard('api')->factory()->getTTL() * 60,
            'user'         => Auth::guard('api')->user(),
        ]);
    }
}
