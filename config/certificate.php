<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Public certificate lookup (mobile app / public site)
    |--------------------------------------------------------------------------
    |
    | Patient tokens (pax_id, e.g. BEST000752) are sequential and therefore
    | guessable. By default a public lookup must include the passport number;
    | the token is only an optional extra check. Set PUBLIC_TOKEN_ONLY_SEARCH=true
    | to also allow searching by token alone (this lets anyone enumerate names,
    | passport numbers and fitness status by walking the token sequence).
    |
    */
    'allow_token_only_search' => (bool) env('PUBLIC_TOKEN_ONLY_SEARCH', false),

    // How long a signed PDF download link returned by the lookup stays valid.
    'pdf_link_ttl_minutes' => (int) env('CERTIFICATE_PDF_LINK_TTL', 30),

    // A medical certificate is valid for this many months after the exam date.
    'validity_months' => 3,
];
