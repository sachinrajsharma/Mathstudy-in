<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class SitemapController extends Controller
{
    // GET /api/sitemap/products  — used by Next.js sitemap.ts
    public function products(): JsonResponse
    {
        $products = Product::active()
            ->select('slug', 'updated_at')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($p) => [
                'slug'       => $p->slug,
                'updated_at' => $p->updated_at->toISOString(),
            ]);

        return response()->json($products);
    }

    // GET /api/sitemap/categories
    public function categories(): JsonResponse
    {
        $categories = Category::select('slug')->orderBy('name')->get()
            ->map(fn ($c) => ['slug' => $c->slug]);

        return response()->json($categories);
    }
}
