<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MedicalReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'bld_group',
        'hiv_antibody',
        'hbsag',
        'hcv',
        'malaria',
        'tpha',
        'tb',
        'filariasis',
        'leishmaniasis',
        'leprosy',
        'free_from_chronic',
        'tumor_cancer',
        'epilepsy',
        'mental_illness',
        'pregnancy',
        'xray',
        'physical',
        'amp',
        'albumin',
        'medical_history',
        'comments',
        'final_status',
        'is_online',
        'height',
        'weight',      // was: wight (typo fixed via migration)
        'eye_right',
        'eye_left',
        'ear_right',
        'ear_left',
        'bp',
        'heart',
        'hernia',
        'h_ceol',
        's_bili',
        'sgot',
        'sgpt',
        'vdrl',
        'hiv',
        'suger',
        'filaria',
        'hemoglo',
        'factor',
        's_urea',
        'rbs',
        's_creati',
        'esr',
        'tc',
        'dc',
        'neutrophils',
        'lymphocytes',
        'eosinophils',
        'monocytes',
        'basophils',
        'rbc',
        'lipid_profile_tg',
        'platelets',
        'tsh',
        'wbc',
        'total_t4',
        'ecg',
        'dop_thc',
        'dop_opi',
        'dop_amp',
        'info',
        'on_line',
    ];

    // ─── Relationships ───────────────────────────────────────────────────────

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
