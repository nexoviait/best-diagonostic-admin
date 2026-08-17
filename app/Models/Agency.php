<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Agency extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'contact_person', 'email', 'mobile_no', 'address', 'price', 'status', 'is_one_time'];

    protected $casts = [
        'is_one_time' => 'boolean',
    ];

    // ─── Relationships ───────────────────────────────────────────────────────

    public function patients()
    {
        return $this->hasMany(Patient::class);
    }

    public function invoices()
    {
        return $this->hasMany(AgencyInvoice::class);
    }
}
