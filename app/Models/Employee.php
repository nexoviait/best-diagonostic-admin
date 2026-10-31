<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $fillable = [
        'employee_code', 'name', 'department_id', 'designation_id', 'email', 'mobile_no',
        'address', 'join_date', 'basic_salary', 'bank_name', 'bank_account_no', 'photo_path', 'status',
    ];

    protected $casts = [
        'join_date' => 'date:Y-m-d',
    ];

    protected $appends = ['photo_url'];

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path;
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function designation()
    {
        return $this->belongsTo(Designation::class);
    }

    public function payrolls()
    {
        return $this->hasMany(Payroll::class);
    }
}
