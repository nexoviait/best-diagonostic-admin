<?php

namespace App\Traits;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/**
 * Saves uploaded files into public/uploads/... with automatic compression and optimization
 * using PHP GD. Ensures patient photos, fingerprints, X-rays, logos, and signatures
 * are stored at standard lightweight dimensions with minimal file size without error.
 */
trait StoresPublicUploads
{
    /**
     * @param UploadedFile $file
     * @param string $subDir (e.g. "patients", "patients/fingerprints", "xrays", "signatures")
     * @param string $prefix (e.g. "photo", "fingerprint", "xray")
     * @return string Web-relative path (e.g. "/uploads/patients/photo_123_ab12cd34.jpg")
     */
    protected function storePublicUpload(UploadedFile $file, string $subDir, string $prefix): string
    {
        $dir = public_path('uploads/' . trim($subDir, '/'));
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $rawExt = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $isImage = in_array($rawExt, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']);

        // Use .jpg for compressed photos/fingerprints/xrays, preserve .png if signature/logo
        $targetExt = $isImage ? ($rawExt === 'png' && str_contains($subDir, 'signature') ? 'png' : 'jpg') : $rawExt;
        $safeName = $prefix . '_' . time() . '_' . Str::random(8) . '.' . $targetExt;
        $destPath = $dir . DIRECTORY_SEPARATOR . $safeName;

        // Try GD compression if it's an image
        if ($isImage && extension_loaded('gd')) {
            $compressed = $this->compressAndSaveImage($file->getRealPath() ?: $file->getPathname(), $destPath, $subDir, $rawExt);
            if ($compressed && file_exists($destPath) && filesize($destPath) > 0) {
                return '/uploads/' . trim($subDir, '/') . '/' . $safeName;
            }
        }

        // Fallback to standard move if non-image or if GD processing encountered an edge case
        $file->move($dir, $safeName);
        return '/uploads/' . trim($subDir, '/') . '/' . $safeName;
    }

    /**
     * Resizes and compresses an image based on destination type.
     */
    private function compressAndSaveImage(string $srcPath, string $destPath, string $subDir, string $origExt): bool
    {
        try {
            $imageData = @file_get_contents($srcPath);
            if ($imageData === false || strlen($imageData) === 0) {
                return false;
            }

            $srcImg = @imagecreatefromstring($imageData);
            if (!$srcImg) {
                return false;
            }

            // Correct EXIF orientation for JPEG from mobile cameras
            if (function_exists('exif_read_data') && in_array($origExt, ['jpg', 'jpeg'])) {
                try {
                    $exif = @exif_read_data($srcPath);
                    if (!empty($exif['Orientation'])) {
                        switch ($exif['Orientation']) {
                            case 3:
                                $srcImg = imagerotate($srcImg, 180, 0);
                                break;
                            case 6:
                                $srcImg = imagerotate($srcImg, -90, 0);
                                break;
                            case 8:
                                $srcImg = imagerotate($srcImg, 90, 0);
                                break;
                        }
                    }
                } catch (\Throwable $t) {
                    // Ignore EXIF parsing errors safely
                }
            }

            $origWidth = imagesx($srcImg);
            $origHeight = imagesy($srcImg);

            if ($origWidth <= 0 || $origHeight <= 0) {
                imagedestroy($srcImg);
                return false;
            }

            $sub = trim(strtolower($subDir), '/');

            // Category-specific sizing & compression targets:
            if (str_contains($sub, 'fingerprint')) {
                // Fingerprints: compact, max 240x300, ~2-8 KB
                $maxW = 240;
                $maxH = 300;
                $quality = 70;
            } elseif (str_contains($sub, 'patient')) {
                // Patient photo: standard passport card size, max 320x400, ~5-15 KB
                $maxW = 320;
                $maxH = 400;
                $quality = 75;
            } elseif (str_contains($sub, 'xray')) {
                // Chest X-ray: clear clinical detail, max 800x1000, ~25-45 KB
                $maxW = 800;
                $maxH = 1000;
                $quality = 72;
            } elseif (str_contains($sub, 'signature')) {
                // Signatures: keep clean lines, max 400x200
                $maxW = 400;
                $maxH = 200;
                $quality = 80;
            } else {
                // General company logos / header / footer
                $maxW = 600;
                $maxH = 600;
                $quality = 80;
            }

            // Compute scaled dimensions (maintaining aspect ratio)
            $ratio = min($maxW / $origWidth, $maxH / $origHeight, 1.0);
            $newW = max(1, (int) round($origWidth * $ratio));
            $newH = max(1, (int) round($origHeight * $ratio));

            $dstImg = imagecreatetruecolor($newW, $newH);

            // Handle transparency for PNG signatures/logos if target is PNG
            if (str_ends_with(strtolower($destPath), '.png')) {
                imagealphablending($dstImg, false);
                imagesavealpha($dstImg, true);
                $transparent = imagecolorallocatealpha($dstImg, 255, 255, 255, 127);
                imagefilledrectangle($dstImg, 0, 0, $newW, $newH, $transparent);
            } else {
                // White background for JPEG
                $white = imagecolorallocate($dstImg, 255, 255, 255);
                imagefilledrectangle($dstImg, 0, 0, $newW, $newH, $white);
            }

            imagecopyresampled($dstImg, $srcImg, 0, 0, 0, 0, $newW, $newH, $origWidth, $origHeight);

            if (str_ends_with(strtolower($destPath), '.png')) {
                // PNG compression level 0-9 (8 is high compression)
                $success = imagepng($dstImg, $destPath, 8);
            } else {
                $success = imagejpeg($dstImg, $destPath, $quality);
            }

            imagedestroy($srcImg);
            imagedestroy($dstImg);

            return (bool) $success;
        } catch (\Throwable $e) {
            return false;
        }
    }
}
