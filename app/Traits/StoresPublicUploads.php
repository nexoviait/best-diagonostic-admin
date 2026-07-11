<?php

namespace App\Traits;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/**
 * Saves uploaded files straight into public/uploads/... via move(), the same
 * way AuthController@updateProfile always has — no storage:link symlink or
 * Storage::disk('public') indirection involved, so nothing can break if a
 * deploy doesn't (re)create the symlink.
 */
trait StoresPublicUploads
{
    /**
     * @return string Web-relative path (e.g. "/uploads/patients/foo_123_ab12cd34.jpg")
     */
    protected function storePublicUpload(UploadedFile $file, string $subDir, string $prefix): string
    {
        $dir = public_path('uploads/' . trim($subDir, '/'));
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $ext = $file->getClientOriginalExtension();
        $safeName = $prefix . '_' . time() . '_' . Str::random(8) . '.' . $ext;
        $file->move($dir, $safeName);

        return '/uploads/' . trim($subDir, '/') . '/' . $safeName;
    }
}
