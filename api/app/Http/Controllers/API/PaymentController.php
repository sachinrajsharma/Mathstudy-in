<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\SecureDownloadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function __construct(private SecureDownloadService $downloadService) {}

    /**
     * POST /api/payment/initiate
     *
     * Creates a pending order and returns a UPI deep-link string.
     * The client renders this as a QR code via the qrcode npm package.
     *
     * Body: { product_id: number, amount?: number }
     */
    public function initiate(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|integer|exists:products,id',
        ]);

        $product = Product::active()->findOrFail($request->product_id);
        $user    = $request->user();

        // Prevent duplicate purchases
        if ($user->hasPurchased($product->id)) {
            return response()->json([
                'success' => false,
                'message' => 'You have already purchased this book. Visit your dashboard to download.',
            ], 409);
        }

        // Generate a unique transaction ID — merchant shows up as "mathstudy.in" in student's bank app
        $txId = 'MS' . strtoupper(Str::random(10));

        $upiId      = config('payment.upi_id');   // e.g. mathstudy@icici
        $upiName    = config('payment.upi_name'); // mathstudy.in
        $amount     = number_format($product->price, 2, '.', '');

        // Standard UPI deep-link  (works with GPay, PhonePe, Paytm, BHIM)
        $upiString = "upi://pay?"
            . "pa={$upiId}"
            . "&pn=" . urlencode($upiName)
            . "&tr={$txId}"
            . "&am={$amount}"
            . "&cu=INR"
            . "&tn=" . urlencode("Purchase: {$product->title}");

        // Create pending order
        DB::transaction(function () use ($user, $product, $txId, $amount) {
            $order = Order::create([
                'user_id'        => $user->id,
                'transaction_id' => $txId,
                'total_amount'   => $product->price,
                'status'         => 'pending',
            ]);

            OrderItem::create([
                'order_id'   => $order->id,
                'product_id' => $product->id,
                'price'      => $product->price,
            ]);
        });

        return response()->json([
            'success'        => true,
            'transaction_id' => $txId,
            'upi_string'     => $upiString,
            'amount'         => $product->price,
            'product_title'  => $product->title,
        ]);
    }

    /**
     * GET /api/payment/status/{txId}
     *
     * Called every 4 seconds by the frontend while the student scans the QR.
     * Returns { status: 'pending'|'paid'|'failed', download_url? }
     *
     * In production, payment confirmation arrives via the /api/payment/webhook
     * endpoint (called by your bank / payment provider). In manual-UPI setups,
     * you confirm via the admin panel and the frontend polls until status changes.
     */
    public function status(Request $request, string $txId): JsonResponse
    {
        $order = Order::with('items.product')
            ->where('transaction_id', $txId)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($order->status === 'paid') {
            // Generate a fresh 15-minute signed download URL for the first item
            $item        = $order->items->first();
            $downloadUrl = $this->downloadService->generateUrl($item, $order->user);

            return response()->json([
                'status'       => 'paid',
                'download_url' => $downloadUrl,
            ]);
        }

        return response()->json(['status' => $order->status]);
    }

    /**
     * POST /api/payment/confirm   (admin-only, manual confirmation)
     *
     * Admin marks an order as paid after verifying the UTR / UPI reference
     * in their bank statement. The frontend then picks it up on the next poll.
     *
     * Body: { transaction_id, upi_ref? }
     */
    public function confirm(Request $request): JsonResponse
    {
        $request->validate([
            'transaction_id' => 'required|string',
            'upi_ref'        => 'nullable|string|max:40',
        ]);

        // Only admin can call this
        abort_unless($request->user()->isAdmin(), 403);

        $order = Order::where('transaction_id', $request->transaction_id)
            ->where('status', 'pending')
            ->firstOrFail();

        $order->markPaid($request->upi_ref);

        // Create a download token immediately so the student can download
        $this->downloadService->issueTokensForOrder($order);

        return response()->json(['success' => true, 'order_id' => $order->id]);
    }

    /**
     * POST /api/payment/webhook
     *
     * If your bank / payment processor sends webhook callbacks (e.g. Cashfree,
     * Razorpay, or a custom UPI monitor), verify the signature and mark the order paid.
     * This is the fully-automated path; the manual /confirm route is the fallback.
     *
     * Signature verification uses HMAC-SHA256 with APP_SIGNED_URL_SECRET.
     */
    public function webhook(Request $request): JsonResponse
    {
        $secret    = config('payment.webhook_secret');
        $payload   = $request->getContent();
        $signature = $request->header('X-Webhook-Signature', '');

        $expected = hash_hmac('sha256', $payload, $secret);

        if (! hash_equals($expected, $signature)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $data = $request->json()->all();

        $txId   = $data['transaction_id'] ?? $data['txn_id']   ?? null;
        $upiRef = $data['upi_ref']        ?? $data['bank_ref']  ?? null;
        $status = $data['status']         ?? null;

        if (! $txId || $status !== 'paid') {
            return response()->json(['received' => true]);
        }

        $order = Order::where('transaction_id', $txId)->where('status', 'pending')->first();
        if (! $order) {
            return response()->json(['received' => true]); // already processed
        }

        $order->markPaid($upiRef);
        $this->downloadService->issueTokensForOrder($order);

        return response()->json(['received' => true]);
    }
}
