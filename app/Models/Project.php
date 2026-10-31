<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'description', 'budget', 'status'];

    protected $appends = ['actual_spent'];

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function revenues()
    {
        return $this->hasMany(Revenue::class);
    }

    /**
     * Sum of every expense linked to this project — what the Entry Form calls "Actual Spent".
     * Uses the eager-loaded `expenses` sum when present (see ProjectController::index/show) to
     * avoid an extra query per row; falls back to a live query otherwise.
     */
    public function getActualSpentAttribute(): string
    {
        if (array_key_exists('expenses_sum_amount', $this->attributes)) {
            return $this->attributes['expenses_sum_amount'] ?? '0.00';
        }

        return (string) $this->expenses()->sum('amount');
    }
}
