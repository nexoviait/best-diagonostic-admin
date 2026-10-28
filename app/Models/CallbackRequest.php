<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CallbackRequest extends Model
{
    public const STATUSES = ['pending', 'called', 'closed'];

    protected $fillable = [
        'name',
        'mobile',
        'reason',
        'message',
        'status',
        'handled_at',
        'handled_by',
    ];

    protected $casts = [
        'handled_at' => 'datetime',
    ];

    public function handler()
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
