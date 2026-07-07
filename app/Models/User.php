<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'username',
        'role',
        'status',
        'mobile_no',
        'user_folder',
        'role_id',
        'company_name_en',
        'company_name_en_title',
        'company_name_bn',
        'company_name_bn_title',
        'company_address_en',
        'company_address_bn',
        'company_phone_en',
        'company_phone_bn',
        'company_pax_en',
        'company_pax_bn',
        'logo_path',
        'signature_physician_path',
        'signature_radiologist_path',
        'signature_authorised_path',
    ];

    /**
     * Appends
     */
    protected $appends = ['permissions', 'role_name'];

    public function getPermissionsAttribute()
    {
        return $this->customRole ? ($this->customRole->permissions ?? []) : [];
    }

    public function getRoleNameAttribute()
    {
        return $this->customRole ? $this->customRole->name : 'MR';
    }

    // ─── Relationships ───────────────────────────────────────────────────────

    public function customRole()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [];
    }

    // ─── Relationships ───────────────────────────────────────────────────────

    public function invoices()
    {
        return $this->hasMany(AgencyInvoice::class);
    }
}
