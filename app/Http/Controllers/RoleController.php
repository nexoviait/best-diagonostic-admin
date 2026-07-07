<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    /**
     * Get all roles.
     */
    public function index()
    {
        return response()->json(Role::orderBy('id')->get());
    }

    /**
     * Create a new role.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles,name',
            'permissions' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $role = Role::create([
            'name' => $request->name,
            'permissions' => $request->permissions ?? [],
        ]);

        return response()->json([
            'message' => 'Role created successfully',
            'role' => $role,
        ], 201);
    }

    /**
     * Update an existing role.
     */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        // Prevent modifying system roles
        if (in_array($role->name, ['Superadmin'])) {
            return response()->json(['error' => 'Cannot modify Superadmin role'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
            'permissions' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $role->update([
            'name' => $request->name,
            'permissions' => $request->permissions ?? [],
        ]);

        return response()->json([
            'message' => 'Role updated successfully',
            'role' => $role,
        ]);
    }

    /**
     * Delete a role.
     */
    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        if (in_array($role->name, ['Superadmin', 'Receive', 'Read-only'])) {
            return response()->json(['error' => 'Cannot delete system default roles'], 403);
        }

        // Reassign users to a default role before deleting (optional but safe)
        User::where('role_id', $role->id)->update(['role_id' => null]);
        
        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }
}
