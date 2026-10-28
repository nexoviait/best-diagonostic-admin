@php
    // Positive-type results are shown red/bold, exactly like the printed report.
    $res = fn ($v) => \App\Services\CertificateBuilder::isAbnormalResult($v);

    // [label, exam key, normal range]
    $fbc = [
        ['Hemoglobin', 'hemoglo', '11.4 g/dl'],
        ['ESR', 'esr', '<30mm 1st hr'],
        ['RBC', 'rbc', '4.5-5.5'],
        ['Platelets', 'platelets', '150-400'],
        ['WBC', 'wbc', '4.0-11.0'],
        ['Neutrophils', 'neutrophils', '40-75%'],
        ['Lymphocytes', 'lymphocytes', '20-40%'],
        ['Eosinophils', 'eosinophils', '02-08%'],
        ['Monocytes', 'monocytes', '01-07%'],
        ['Basophils', 'basophils', '<01%'],
    ];
    $urine = [
        ['Sugar', 'suger', 'Nill', false],
        ['Albumin', 'albumin', '<20', false],
    ];
    $bio = [
        ['R.B.S', 'rbs', '<7.5 mmol/L'],
        ['S. Bilirubin', 's_bili', '<1.2 mg/dl'],
        ['SGPT', 'sgpt', '<45 U/L'],
        ['SGOT', 'sgot', '<35 U/L'],
        ['S. Creatinine', 's_creati', '<1.4 mg/dl'],
        ['Lipid Profile', 'lipid_profile_tg', '<150 mg/dl'],
        ['TSH', 'tsh', '0.3 - 4.5'],
        ['Total T4', 'total_t4', '3.2 - 12.6'],
    ];
    $sero = [
        ['HIV I & HIV II', 'hiv'],
        ['HBsAg', 'hbsag'],
        ['Anti HCV', 'hcv'],
        ['TPHA', 'tpha'],
        ['VDRL', 'vdrl'],
    ];
    $p = $data['patient'];
    $e = $data['exam'];
    $img = $data['images'];
@endphp
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Medical Certificate {{ $p['pax_id'] }}</title>
<style>
    @page { margin: 0; size: A4 portrait; }
    * { font-family: Helvetica, Arial, sans-serif; color: #000; }
    body { margin: 0; padding: 0; font-size: 11px; }
    table { border-collapse: collapse; }
    .grid td, .grid th { border: 1px solid #000; padding: 2px 4px; font-size: 11px; }
    .grid th { background: #eeeeee; font-size: 13px; text-align: center; padding: 2px; }
    .lbl { font-weight: bold; }
    .c { text-align: center; }
    .grp { font-weight: bold; text-align: center; font-size: 10px; }
    .val { font-weight: bold; text-align: center; font-size: 10px; }
    .rng { font-size: 9px; text-align: right; white-space: nowrap; }
    .bad { color: #dc2626; font-weight: bold; }
    .meta td { border: 1px solid #000; padding: 2px 4px; font-size: 13px; white-space: nowrap; }
</style>
</head>
<body>

{{-- Watermark --}}
@if($img['logo'])
    <div style="position: absolute; top: 300px; left: 97px; width: 600px; opacity: 0.10;">
        <img src="{{ $img['logo'] }}" style="width: 600px;">
    </div>
@endif

{{-- Header (edge to edge) --}}
@if($img['header'])
    <img src="{{ $img['header'] }}" style="width: 100%; display: block;">
@else
    <table style="width: 100%; border-bottom: 2px solid #16a34a; margin-bottom: 2px;">
        <tr>
            <td style="padding: 8px 28px; width: 60px;">
                @if($img['logo'])<img src="{{ $img['logo'] }}" style="height: 48px;">@endif
            </td>
            <td style="padding: 8px 0;">
                <div style="font-size: 20px; font-weight: bold; color: #dc2626;">{{ $data['company']['name_en'] }}</div>
            </td>
        </tr>
    </table>
@endif

<div style="padding: 0 28px;">

    <div style="font-size: 20px; font-weight: bold; text-align: center; margin: 2px 0 3px 0;">Medical Report</div>

    {{-- Patient details + photo --}}
    <table style="width: 100%; margin-bottom: 4px;">
        <tr>
            <td style="vertical-align: top;">
                <table class="meta" style="width: 100%;">
                    <tr>
                        <td class="lbl" style="width: 14%;">SL No :</td>
                        <td class="lbl c" style="width: 21%;">{{ $p['pax_id'] }}</td>
                        <td class="lbl" style="width: 14%;">Examined :</td>
                        <td class="c" style="width: 15%;">{{ $p['exam_date'] }}</td>
                        <td class="lbl" style="width: 17%;">Expired :</td>
                        <td class="lbl c" style="width: 19%;">{{ $p['expiry_date'] }}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Name :</td>
                        <td class="lbl c" colspan="2" style="text-transform: uppercase;">{{ $p['name'] }}</td>
                        <td class="c"><b>Age:</b> {{ $p['age'] }}</td>
                        <td class="lbl">Nationality :</td>
                        <td class="lbl c">{{ $p['nationality'] }}</td>
                    </tr>
                    <tr>
                        <td class="lbl">F/H Name :</td>
                        <td class="lbl c" colspan="2" style="text-transform: uppercase;">{{ $p['father_name'] }}</td>
                        <td class="c"><b>Sex:</b> {{ $p['sex'] }}</td>
                        <td class="lbl">Passport No :</td>
                        <td class="lbl c">{{ $p['passport_no'] }}</td>
                    </tr>
                    <tr>
                        <td class="lbl">Traveling To :</td>
                        <td class="lbl c" style="text-transform: uppercase;">{{ $p['country'] }}</td>
                        <td class="lbl">Agency :</td>
                        <td class="lbl c" colspan="3" style="text-transform: uppercase;">{{ $p['agency'] }}</td>
                    </tr>
                </table>
            </td>
            <td style="width: 84px; vertical-align: top; padding-left: 4px;">
                <div style="width: 78px; height: 96px; border: 1px solid #000; text-align: center;">
                    @if($img['photo'])
                        <img src="{{ $img['photo'] }}" style="width: 78px; height: 96px;">
                    @else
                        <div style="padding-top: 40px; font-size: 12px; font-weight: bold;">IMAGE</div>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    {{-- Two column body --}}
    <table style="width: 100%;">
        <tr>
            {{-- LEFT --}}
            <td style="width: 49%; vertical-align: top;">
                <table class="grid" style="width: 100%; margin-bottom: 4px;">
                    <tr><th colspan="4">PHYSICAL EXAMINATION</th></tr>
                    <tr>
                        <td class="lbl">HEIGHT</td><td class="c">{{ $e['height'] }}</td>
                        <td class="lbl">WEIGHT</td><td class="c">{{ $e['weight'] }}</td>
                    </tr>
                    <tr>
                        <td class="lbl">HEART</td><td class="c">{{ $e['heart'] }}</td>
                        <td class="lbl">B.P.</td><td class="c">{{ $e['bp'] }}</td>
                    </tr>
                    <tr>
                        <td class="lbl">LIVER</td><td class="c">{{ $e['liver'] }}</td>
                        <td class="lbl">SPLEEN</td><td class="c">{{ $e['spleen'] }}</td>
                    </tr>
                    <tr>
                        <td class="lbl">LEFT EYE</td><td class="c lbl">{{ $e['eye_left'] }}</td>
                        <td class="lbl">RIGHT EYE</td><td class="c lbl">{{ $e['eye_right'] }}</td>
                    </tr>
                    <tr>
                        <td class="lbl">LEFT EAR</td><td class="c">{{ $e['ear_left'] }}</td>
                        <td class="lbl">RIGHT EAR</td><td class="c">{{ $e['ear_right'] }}</td>
                    </tr>
                    <tr>
                        <td class="lbl">HERNIA</td><td class="c">{{ $e['hernia'] }}</td>
                        <td class="lbl">SKIN</td><td class="c">{{ $e['skin'] }}</td>
                    </tr>
                    <tr>
                        <td class="lbl">DEFORMITIES :</td><td class="c" colspan="3">{{ $e['deformities'] }}</td>
                    </tr>
                </table>

                <table class="grid" style="width: 100%;">
                    <tr><th colspan="3">MEDICAL EXAMINATION</th></tr>
                    <tr>
                        <td class="lbl c" colspan="2" style="background: #fff;">Type of the Examination</td>
                        <td class="lbl c" style="width: 128px;">Result</td>
                    </tr>
                    <tr>
                        <td class="grp" rowspan="2" style="width: 80px;">OTHERS</td>
                        <td>Varicose Veins</td>
                        <td class="val"><span class="{{ $res($e['varicose_veins']) ? 'bad' : '' }}">{{ $e['varicose_veins'] }}</span></td>
                    </tr>
                    <tr>
                        <td>Psychiatry</td>
                        <td class="val"><span class="{{ $res($e['psychiatry']) ? 'bad' : '' }}">{{ $e['psychiatry'] }}</span></td>
                    </tr>
                    <tr>
                        <td class="grp" rowspan="3">DRUG TEST</td>
                        <td>DOP-THC</td>
                        <td class="val"><span class="{{ $res($e['dop_thc']) ? 'bad' : '' }}">{{ $e['dop_thc'] }}</span></td>
                    </tr>
                    <tr>
                        <td>DOP-OPI</td>
                        <td class="val"><span class="{{ $res($e['dop_opi']) ? 'bad' : '' }}">{{ $e['dop_opi'] }}</span></td>
                    </tr>
                    <tr>
                        <td>DOP-AMP</td>
                        <td class="val"><span class="{{ $res($e['dop_amp']) ? 'bad' : '' }}">{{ $e['dop_amp'] }}</span></td>
                    </tr>
                    @foreach($fbc as $i => $row)
                        <tr>
                            @if($i === 0)<td class="grp" rowspan="11">FULL BLOOD<br>COUNT</td>@endif
                            <td>{{ $row[0] }}</td>
                            <td style="padding: 0;">
                                <table style="width: 100%;"><tr>
                                    <td class="val" style="border: 0; padding: 2px 4px;">{{ $e[$row[1]] }}</td>
                                    <td class="rng" style="border: 0; padding: 2px 4px; width: 70px;">{{ $row[2] }}</td>
                                </tr></table>
                            </td>
                        </tr>
                    @endforeach
                    <tr>
                        <td>Blood Group</td>
                        <td class="val">{{ $e['bld_group'] }}</td>
                    </tr>
                    <tr>
                        <td class="lbl" colspan="2">ELECTRO CARDIOGRAPH (ECG)</td>
                        <td class="val">{{ $e['ecg'] }}</td>
                    </tr>
                </table>
            </td>

            {{-- RIGHT --}}
            <td style="width: 51%; vertical-align: top; padding-left: 8px;">
                <table class="grid" style="width: 100%; margin-bottom: 4px;">
                    <tr><th colspan="3">Laboratory Investigation</th></tr>
                    <tr>
                        <td class="lbl c" colspan="2" style="background: #fff;">Type of the Examination</td>
                        <td class="lbl c" style="background: #fff;">Result</td>
                    </tr>
                    @foreach($urine as $i => $row)
                        <tr>
                            @if($i === 0)<td class="grp" rowspan="3" style="width: 26%;">URINE R/M/E</td>@endif
                            <td style="width: 32%;">{{ $row[0] }}</td>
                            <td style="padding: 0;">
                                <table style="width: 100%;"><tr>
                                    <td class="val" style="border: 0; padding: 2px 4px;">{{ $e[$row[1]] }}</td>
                                    <td class="rng" style="border: 0; padding: 2px 4px; width: 70px;">{{ $row[2] }}</td>
                                </tr></table>
                            </td>
                        </tr>
                    @endforeach
                    <tr>
                        <td>Pregnancy</td>
                        <td class="val"><span class="{{ $res($e['pregnancy']) ? 'bad' : '' }}">{{ $e['pregnancy'] }}</span></td>
                    </tr>

                    @foreach($bio as $i => $row)
                        <tr>
                            @if($i === 0)<td class="grp" rowspan="8">BLOOD-<br>BIOCHEMISTRY</td>@endif
                            <td>{{ $row[0] }}</td>
                            <td style="padding: 0;">
                                <table style="width: 100%;"><tr>
                                    <td class="val" style="border: 0; padding: 2px 4px;"><span class="{{ $res($e[$row[1]]) ? 'bad' : '' }}">{{ $e[$row[1]] }}</span></td>
                                    <td class="rng" style="border: 0; padding: 2px 4px; width: 70px;">{{ $row[2] }}</td>
                                </tr></table>
                            </td>
                        </tr>
                    @endforeach

                    @foreach($sero as $i => $row)
                        <tr>
                            @if($i === 0)<td class="grp" rowspan="5">BLOOD-ELISA &amp;<br>SEROLOGY</td>@endif
                            <td>{{ $row[0] }}</td>
                            <td class="val"><span class="{{ $res($e[$row[1]]) ? 'bad' : '' }}">{{ $e[$row[1]] }}</span></td>
                        </tr>
                    @endforeach

                    <tr>
                        <td class="grp" rowspan="2">X-RAY<br>INVESTIGATION</td>
                        <td style="height: 30px;">Chest X-Ray</td>
                        <td class="c">{{ \Illuminate\Support\Str::limit($data['xray']['findings'], 60) }}</td>
                    </tr>
                    <tr>
                        <td>Remarks</td>
                        <td class="c">{{ \Illuminate\Support\Str::limit($data['xray']['remark'], 40) }}</td>
                    </tr>
                </table>

                {{-- X-ray, fingerprint, signature --}}
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 142px; vertical-align: middle;">
                            <div style="width: 140px; height: 150px; border: 1px solid #000; background: #f8d7da; text-align: center;">
                                @if($img['xray'])
                                    <img src="{{ $img['xray'] }}" style="width: 140px; height: 150px;">
                                @else
                                    <div style="padding-top: 68px; font-size: 11px; font-weight: bold;">X-RAY</div>
                                @endif
                            </div>
                        </td>
                        <td style="width: 74px; vertical-align: middle; padding-left: 6px;">
                            <div style="width: 68px; height: 68px; border: 1px solid #000; background: #f8d7da; text-align: center;">
                                @if($img['fingerprint'])
                                    <img src="{{ $img['fingerprint'] }}" style="width: 68px; height: 68px;">
                                @else
                                    <div style="padding-top: 28px; font-size: 8px; font-weight: bold;">FINGERPRINT</div>
                                @endif
                            </div>
                        </td>
                        <td style="vertical-align: bottom; text-align: center; padding-left: 4px;">
                            <div style="height: 48px; text-align: center;">
                                @if($img['signature'])
                                    <img src="{{ $img['signature'] }}" style="max-height: 45px; max-width: 150px;">
                                @endif
                            </div>
                            <div style="border-top: 1px dotted #000; padding-top: 2px; font-size: 8.5px; font-weight: bold;">SIGNATURE OF CHIEF PHYSICIAN</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- QR + remarks --}}
    <table style="width: 100%; margin-top: 6px;">
        <tr>
            <td style="width: 62px; vertical-align: top;">
                @if($img['qr'])
                    <img src="{{ $img['qr'] }}" style="width: 55px; height: 55px; border: 1px solid #000;">
                @endif
            </td>
            <td style="vertical-align: top; font-size: 12px;">
                <div>
                    <b>Remarks: Medical Report for </b>
                    <b style="text-transform: uppercase;">{{ $p['name'] }}</b>
                    <b> is Medically </b>
                </div>
                <table style="margin-top: 2px;">
                    <tr>
                        <td style="font-weight: bold; font-size: 12px; padding: 0 6px 0 0;">Info:</td>
                        <td style="background: {{ $data['verdict_color'] }}; padding: 2px 8px;">
                            <span style="color: #fff; font-weight: bold; font-size: 14px;">{{ $data['verdict'] }}</span>
                        </td>
                    </tr>
                </table>
                <div style="margin-top: 3px;"><b>Comment: {{ $e['comments'] }}</b></div>
            </td>
        </tr>
    </table>

</div>

{{-- Footer (pinned to the bottom of the page, like the printed report) --}}
<div style="position: absolute; left: 28px; right: 28px; bottom: 8px;">
    <div style="border-top: 2px solid #16a34a; padding-top: 4px; text-align: center;">
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">
            To verify this medical report, visit www.bestdiagnostic.com.bd or scan the QR code.
        </div>
        @if($img['footer'])
            <img src="{{ $img['footer'] }}" style="width: 100%;">
        @else
            <div style="color: #16a34a; font-weight: bold; font-size: 10px; text-transform: uppercase;">{{ $data['company']['address_en'] }}</div>
            <div style="color: #16a34a; font-weight: bold; font-size: 10px;">{{ $data['company']['phone_en'] }}</div>
            <div style="color: #dc2626; font-weight: bold; font-size: 11px;">www.bestdiagnostic.com.bd</div>
        @endif
    </div>
</div>

</body>
</html>
