<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    protected $fillable = [
        'employee_id', 'month', 'year', 'basic_salary', 'allowances', 'deductions',
        'payment_status', 'payment_date', 'remarks', 'generated_by',
    ];

    protected $casts = [
        'payment_date' => 'date:Y-m-d',
    ];

    protected $appends = ['net_salary'];

    public function getNetSalaryAttribute(): string
    {
        $net = (float) $this->basic_salary + (float) $this->allowances - (float) $this->deductions;
        return number_format($net, 2, '.', '');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
