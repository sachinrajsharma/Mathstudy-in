<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    // GET /api/categories
    public function index(): JsonResponse
    {
        $categories = Category::withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'id'            => $c->id,
                'name'          => $c->name,
                'slug'          => $c->slug,
                'description'   => $c->description,
                'product_count' => $c->products_count,
            ]);

        return response()->json($categories);
    }

    // GET /api/categories/{slug}
    public function show(string $slug): JsonResponse
    {
        $cat = Category::withCount('products')->where('slug', $slug)->firstOrFail();
        return response()->json([
            'id'            => $cat->id,
            'name'          => $cat->name,
            'slug'          => $cat->slug,
            'description'   => $cat->description,
            'product_count' => $cat->products_count,
        ]);
    }
}
