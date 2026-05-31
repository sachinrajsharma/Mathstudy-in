<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DownloadToken;
use App\Services\SecureDownloadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private SecureDownloadService $downloadService) {}

    /**
     * GET /api/user/orders
     *
     * Returns all orders for the authenticated user, with download URLs
     * for items that are paid and have valid tokens.
     */
    public function index(Request $request): JsonResponse
    {
        $user   = $request->user();
        $orders = $user->orders()
            ->with('items.product')
            ->latest()
            ->get();

        $result = $orders->map(function ($order) use ($user) {
            return [
                'id'           => $order->id,
                'status'       => $order->status,
                'total_amount' => $order->total_amount,
                'created_at'   => $order->created_at->toISOString(),
                'items'        => $order->items->map(function ($item) use ($order, $user) {
                    $token = null;

                    if ($order->isPaid()) {
                        // Find valid existing token or issue a fresh one
                        $tokenRecord = $item->downloadTokens()
                            ->where('user_id', $user->id)
                            ->where('expires_at', '>', now())
                            ->where('uses', '<', 5)
                            ->latest()
                            ->first();

                        if (! $tokenRecord) {
                            $tokenRecord = $this->downloadService->issueToken($item, $user);
                        }

                        if ($tokenRecord) {
                            $token = $this->downloadService->buildSignedUrl($tokenRecord->token);
                        }
                    }

                    return [
                        'product_id'     => $item->product_id,
                        'title'          => $item->product->title,
                        'cover_image'    => $item->product->cover_image,
                        'download_url'   => $token?->url ?? null,
                        'download_valid' => $token !== null,
                    ];
                }),
            ];
        });

        return response()->json($result);
    }
}
