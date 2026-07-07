<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AgencyInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_no',
        'agency_id',
        'date',
        'user_id',
        'net_amount',
        'received_amount',
        'due_amount',
        'in_words',
        'payment_month'
    ];

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
