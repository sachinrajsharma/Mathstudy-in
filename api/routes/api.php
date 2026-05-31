<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\CategoryController;
use App\Http\Controllers\API\DownloadController;
use App\Http\Controllers\API\OrderController;
use App\Http\Controllers\API\PaymentController;
use App\Http\Controllers\API\ProductController;
use App\Http\Controllers\API\SearchController;
use App\Http\Controllers\API\SitemapController;
use Illuminate\Support\Facades\Route;

// ── Rate limiting is defined in bootstrap/app.php or RouteServiceProvider ────

// ── Public routes (no auth required) ─────────────────────────────────────────

// Products
Route::get('/products',             [ProductController::class, 'index']);
Route::get('/products/{slug}',      [ProductController::class, 'show']);
Route::get('/products/{id}/reviews',[ProductController::class, 'reviews']);

// Categories
Route::get('/categories',           [CategoryController::class, 'index']);
Route::get('/categories/{slug}',    [CategoryController::class, 'show']);

// Search
Route::get('/search/suggest',       [SearchController::class,  'suggest']);

// Sitemap (consumed by Next.js sitemap.ts at build / ISR)
Route::get('/sitemap/products',     [SitemapController::class, 'products']);
Route::get('/sitemap/categories',   [SitemapController::class, 'categories']);

// ── Auth routes ───────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    // Protected auth routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
    });
});

// ── Payment ───────────────────────────────────────────────────────────────────

// Webhook is unauthenticated (bank calls it) — signature verified inside controller
Route::post('/payment/webhook', [PaymentController::class, 'webhook']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/payment/initiate',        [PaymentController::class, 'initiate']);
    Route::get('/payment/status/{txId}',    [PaymentController::class, 'status']);
    Route::post('/payment/confirm',         [PaymentController::class, 'confirm']);  // admin only
});

// ── Download (signed URL — no Sanctum needed, token IS the auth) ──────────────
Route::get('/download/{token}', [DownloadController::class, 'serve']);

// ── User account (auth required) ─────────────────────────────────────────────
Route::middleware('auth:sanctum')->prefix('user')->group(function () {
    Route::get('/orders', [OrderController::class, 'index']);
});
