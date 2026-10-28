<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

/**
 * An Agency doubles as a login identity for the Agency Portal (separate "agency" guard, see
 * config/auth.php) — one shared username/password per agency, set by Admin from Agency List.
 */
class Agency extends Authenticatable implements JWTSubject
{
    use HasFactory;

    protected $fillable = [
        'name', 'contact_person', 'email', 'mobile_no', 'address', 'price', 'status', 'is_one_time',
        'username', 'password', 'logo_path',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'is_one_time' => 'boolean',
        'password' => 'hashed',
        'portal_last_login_at' => 'datetime',
        'portal_password_changed_at' => 'datetime',
    ];

    /** Append logo_url to every JSON response, same pattern as Patient::image_url. */
    protected $appends = ['logo_url'];

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path;
    }

    // ─── Relationships ───────────────────────────────────────────────────────

    public function patients()
    {
        return $this->hasMany(Patient::class);
    }

    public function invoices()
    {
        return $this->hasMany(AgencyInvoice::class);
    }

    // ─── JWT (Agency Portal login) ──────────────────────────────────────────

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }
}
