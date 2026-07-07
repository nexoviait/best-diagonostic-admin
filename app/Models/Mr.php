<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Mr extends Model
{
    use HasFactory;

    protected $table = 'mrs';

    protected $fillable = ['name', 'email', 'mobile_no', 'role', 'status'];

    // ─── Relationships ───────────────────────────────────────────────────────

    public function patients()
    {
        return $this->hasMany(Patient::class, 'mr_id');
    }
}
