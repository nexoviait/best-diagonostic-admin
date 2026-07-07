<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class XrayReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'date',
        'remark',
        'findings',
        'result',
        'image_path',
    ];

    protected $appends = ['image_url'];

    /**
     * Returns the publicly accessible URL for the x-ray image,
     * or null if no image has been uploaded yet.
     */
    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) {
            return null;
        }
        return '/storage/' . $this->image_path;
    }

    // ─── Relationships ───────────────────────────────────────────────────────

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
