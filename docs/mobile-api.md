# Mobile app API (BEST Diagnostic)

Base URL: `https://admin.bestdiagnostic.com.bd/api`. All bodies and responses are JSON unless noted.
Import [postman/best-diagnostic-mobile.postman_collection.json](postman/best-diagnostic-mobile.postman_collection.json) into Postman to try every call below.

## Patient side (no login)

### Search a report

`GET /public/certificate/search?passport_no=A04539821[&token=BEST000752]`

- `passport_no` is required. `token` (the slip / pax ID) is an optional extra check: if sent, both must match.
- Token-only search is off by default because tokens are sequential (anyone could walk `BEST000001…` and read names and passport numbers). It can be enabled with `PUBLIC_TOKEN_ONLY_SEARCH=true` in `.env`.
- Limit: 20 requests per minute per IP.

```json
{
  "token": "BEST000752",
  "name": "MD AL-AMIN HOSSAIN",
  "passport_no": "A04539821",
  "country": "Saudi Arabia",
  "exam_date": "2026-09-14",
  "expiry_date": "2026-12-14",
  "is_expired": false,
  "status": "Fit",
  "pdf_url": "https://admin.bestdiagnostic.com.bd/api/public/certificate/BEST000752/pdf?expires=…&signature=…",
  "pdf_expires_at": "2026-09-21T10:30:00+00:00"
}
```

`status` is `Fit`, `Unfit` or `Held up`: the worst of the Report Entry status and the X-ray result (Unfit > Held up > Fit). No test values, fees or images are returned.
Errors: `422` passport missing, `404` `{"error": "No report found for the details provided"}`, `429` too many requests.

### Download the certificate PDF

`GET <pdf_url>` returns `application/pdf` (`Medical-Certificate-<token>.pdf`).

- The link comes from the search response, is signed, and expires after 30 minutes (`CERTIFICATE_PDF_LINK_TTL`). Search again to get a fresh link.
- Any change to the link (e.g. another token) gives `403`.
- Limit: 10 per minute per IP.

### Request a callback

`POST /public/callback-requests`

```json
{ "name": "Md Rahman", "mobile": "01712345678", "reason": "Online Report Status", "message": "optional" }
```

`201` `{ "message": "...", "id": 12 }`, `422` flat error object (`{"mobile": ["..."]}`). Limit: 3 per minute, 10 per hour per IP.

### Site details

`GET /public/site-settings` returns company name, address, phone and logo paths, plus `it_helpdesk_phone` and `it_helpdesk_email` (edited in the web admin under Site Settings > Email & Support; either may be null).

## Staff side (JWT)

Send `Authorization: Bearer <access_token>` on every call.

| Call | Purpose |
| --- | --- |
| `POST /auth/login` `{ "login": "<username or email>", "password": "..." }` | Returns `access_token`, `expires_in`, `user`. Limit: 5 per minute per account + IP. |
| `POST /auth/refresh` | New token for the one sent in the `Authorization` header. Works even after the 60 minute token has expired, for up to 14 days after login (`JWT_REFRESH_TTL`); after that, or for a deactivated account, it returns 401 / 403. Limit: 30 per minute. |
| `POST /auth/logout` | Invalidate the token. |
| `GET /auth/me` | Current user, role and permissions. |
| `GET /dashboard` | Totals, recent patients and `pending_callbacks`. |
| `GET /patients` | Patient list. See pagination below. |
| `GET /patients/{id}`, `POST /patients`, `PUT /patients/{id}` | Detail, create (multipart for photo), update. |
| `GET /medical-reports/{patient_id}`, `POST /medical-reports` | Read / save the medical report. |
| `GET /xray-reports/{patient_id}`, `POST /xray-reports` | Read / save the X-ray report (multipart for image). |
| `GET /countries`, `/agencies`, `/mrs` | Reference data for the Entry form. |
| `GET /callback-requests?status=pending&per_page=20` | Callback requests, newest first (paginated). |
| `PATCH /callback-requests/{id}` `{ "status": "called" }` | `pending`, `called` or `closed`. |

### Forgot password (no login, e-mail code)

Staff who forgot their password get a 6-digit code by e-mail, sent through Brevo. The Brevo API key and the verified sender address are entered in the web admin (Site Settings > Email & Support) and stored encrypted in the database, not in `.env`.

| Call | Purpose |
| --- | --- |
| `POST /auth/forgot-password` `{ "login": "<username or email>" }` | Sends the code. The answer (`200`) is identical whether or not the account exists. `503` only when no Brevo key is saved yet. Limit: 2 per minute, 6 per hour per IP; one code per account per minute. |
| `POST /auth/reset-password` `{ "login", "code", "password", "password_confirmation" }` | Sets the new password (min 6). `422` `{ "error": ... }` for a wrong or expired code. A code lives 15 minutes, dies after 5 wrong guesses and works once. Limit: 10 per 15 minutes per IP. |

A reset (or a password change) ends all older sessions: tokens issued before it can no longer be refreshed, so a lost phone stops working within the 60 minute token life.

### Admin settings (web admin, Admin / Superadmin / `manage_settings`)

| Call | Purpose |
| --- | --- |
| `GET /app-settings` | `brevo_api_key_set`, `brevo_api_key_hint` (last 4 characters only), `mail_sender_email`, `mail_sender_name`, `it_helpdesk_phone`, `it_helpdesk_email`. The key itself is never returned. |
| `PUT /app-settings` | Save any of those fields. A blank `brevo_api_key` keeps the stored one; `clear_brevo_api_key: true` removes it. |
| `POST /app-settings/test-email` | Sends a test e-mail to the caller's own address and returns Brevo's error if it fails. |

### Patient list filters and pagination

`GET /patients` filters: `search_field` (`pax`, `passport`, `name`) with `search_value`, `from_date`, `to_date` (`YYYY-MM-DD`), `agency_id`, `mr_id`, `created_by`, `sort_dir` (`asc`/`desc`).

- Without `per_page` the response is the full array (what the website uses).
- With `per_page` (1 to 100) and `page` the response is a Laravel paginator: `{ data: [...], current_page, last_page, total, per_page, next_page_url, ... }`. The mobile list should always send `per_page`.

## Deploying these changes

On the VPS after `git pull`:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:clear && php artisan route:clear
```

`composer install` is required because the PDF (`barryvdh/laravel-dompdf`) and QR (`chillerlan/php-qrcode`) packages were added. The PHP `gd` and `mbstring` extensions must be enabled on the server.
