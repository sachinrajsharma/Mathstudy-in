<?php

return [
    /*
    |--------------------------------------------------------------------------
    | UPI Payment Configuration
    |--------------------------------------------------------------------------
    |
    | UPI ID: your registered VPA, e.g. mathstudy@icici or 9876543210@ybl
    | UPI Name: displayed in the student's banking app as the merchant name.
    |           Set it to "mathstudy.in" so students recognise the payee.
    |
    */

    'upi_id'   => env('UPI_ID',   'mathstudy@icici'),
    'upi_name' => env('UPI_NAME', 'mathstudy.in'),

    /*
    |--------------------------------------------------------------------------
    | Signed Download URL
    |--------------------------------------------------------------------------
    |
    | Secret used for HMAC-SHA256 signing of download URLs.
    | Set APP_SIGNED_URL_SECRET to a long random string in .env.
    |
    | TTL: how many minutes a download link stays valid (default 15).
    |
    */

    'signed_url_secret'    => env('APP_SIGNED_URL_SECRET', ''),
    'download_ttl_minutes' => env('DOWNLOAD_TTL_MINUTES', 15),

    /*
    |--------------------------------------------------------------------------
    | Webhook Secret
    |--------------------------------------------------------------------------
    |
    | Used to verify HMAC signatures on incoming payment webhook callbacks.
    | Must match the secret configured in your payment processor dashboard.
    |
    */

    'webhook_secret' => env('PAYMENT_WEBHOOK_SECRET', ''),
];
