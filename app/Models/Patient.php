<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Patient extends Model
{
    use HasFactory;

    protected $fillable = [
        'pax_id',
        'date',
        'country_id',
        'nationality',
        'first_name',
        'last_name',
        'father_name',
        'mother_name',
        'mobile_no',
        'dob',
        'sex',
        'passport_no',
        'visa_no',
        'issue_date',
        'job_applied',
        'agency_id',
        'mr_id',
        'created_by',
        'image_path',
        'fingerprint_path',
        'fingerprint_template',
        'fingerprint_quality',
        'medical_fee',
        'received_amount',
        'due_amount',
        'niddle_charge',
        'in_words',
    ];

    /**
     * Append image_url to every JSON response so the frontend
     * can display the patient photo without building the URL itself.
     */
    protected $appends = ['image_url', 'fingerprint_url'];

    /**
     * Hide the raw template blob from list/detail JSON responses; it's only
     * needed for future match/verify features, not for display.
     */
    protected $hidden = ['fingerprint_template'];

    /**
     * Returns the publicly accessible URL for the patient photo,
     * or null if no photo has been uploaded yet.
     */
    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path;
    }

    /**
     * Returns the publicly accessible URL for the patient fingerprint,
     * or null if no fingerprint has been uploaded yet.
     */
    public function getFingerprintUrlAttribute(): ?string
    {
        return $this->fingerprint_path;
    }

    // ─── Relationships ───────────────────────────────────────────────────────

    public function country()
    {
        return $this->belongsTo(Country::class);
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function mr()
    {
        return $this->belongsTo(Mr::class, 'mr_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function medicalReport()
    {
        return $this->hasOne(MedicalReport::class);
    }

    public function xrayReport()
    {
        return $this->hasOne(XrayReport::class);
    }
}
