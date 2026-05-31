<?php

namespace App\Services;

use App\Models\DownloadToken;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class SecureDownloadService
{
    private string $secret;
    private int    $ttlMinutes;

    public function __construct()
    {
        $this->secret     = config('payment.signed_url_secret');
        $this->ttlMinutes = (int) config('payment.download_ttl_minutes', 15);
    }

    /**
     * Generate a 15-minute signed download URL for a given order item.
     * Called by PaymentController::status() on successful payment confirmation.
     *
     * URL format:
     *   https://mathstudy.in/api/download/{token}?expires={ts}&sig={hmac}
     */
    public function generateUrl(OrderItem $item, User $user): string
    {
        $token = $this->issueToken($item, $user);
        return $this->buildSignedUrl($token->token);
    }

    /**
     * Issue (or refresh) a DownloadToken DB record.
     */
    public function issueToken(OrderItem $item, User $user): DownloadToken
    {
        return DownloadToken::create([
            'order_item_id' => $item->id,
            'user_id'       => $user->id,
            'product_id'    => $item->product_id,
            'token'         => Str::random(64),
            'uses'          => 0,
            'max_uses'      => 5,
            'expires_at'    => now()->addMinutes($this->ttlMinutes),
        ]);
    }

    /**
     * Issue tokens for every item in a paid order.
     * Called after webhook / manual confirmation.
     */
    public function issueTokensForOrder(Order $order): void
    {
        $order->load('items', 'user');

        foreach ($order->items as $item) {
            // Avoid duplicate tokens if already issued
            $exists = DownloadToken::where('order_item_id', $item->id)
                ->where('expires_at', '>', now())
                ->exists();

            if (! $exists) {
                $this->issueToken($item, $order->user);
            }
        }
    }

    /**
     * Build a signed URL string from a raw token value.
     *
     * Signature covers: token + expiry timestamp.
     * Server validates the HMAC on every /api/download/{token} hit.
     */
    public function buildSignedUrl(string $token): string
    {
        $expires = time() + ($this->ttlMinutes * 60);
        $sig     = hash_hmac('sha256', "{$token}:{$expires}", $this->secret);

        $base = rtrim(config('app.url'), '/');
        return "{$base}/api/download/{$token}?expires={$expires}&sig={$sig}";
    }

    /**
     * Validate the HMAC signature on an incoming download request.
     * Called first inside DownloadController::serve().
     */
    public function validateSignature(Request $request): void
    {
        $token   = $request->route('token');
        $expires = (int) $request->query('expires', 0);
        $sig     = $request->query('sig', '');

        if ($expires < time()) {
            abort(410, 'This download link has expired. Please visit your dashboard to get a new one.');
        }

        $expected = hash_hmac('sha256', "{$token}:{$expires}", $this->secret);

        if (! hash_equals($expected, $sig)) {
            abort(403, 'Invalid download link.');
        }
    }
}
