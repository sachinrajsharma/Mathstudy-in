<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    // GET /api/products
    public function index(Request $request): JsonResponse
    {
        $query = Product::active()->with('category');

        // Featured filter
        if ($request->boolean('featured')) {
            $query->featured();
        }

        // Category by slug
        if ($request->filled('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->category));
        }

        // Category by ID (internal use)
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Exclude a specific product
        if ($request->filled('exclude')) {
            $query->where('id', '!=', $request->exclude);
        }

        // Search
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($sub) use ($q) {
                $sub->where('title', 'like', "%{$q}%")
                    ->orWhere('short_desc', 'like', "%{$q}%")
                    ->orWhere('grade', 'like', "%{$q}%");
            });
        }

        // Sort
        match ($request->get('sort', 'latest')) {
            'price_asc'  => $query->orderBy('price'),
            'price_desc' => $query->orderByDesc('price'),
            'popular'    => $query->orderByDesc('downloads'),
            default      => $query->latest(),
        };

        $perPage = min((int) $request->get('per_page', 12), 50);

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data'         => $paginated->items(),
            'total'        => $paginated->total(),
            'per_page'     => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
        ]);
    }

    // GET /api/products/{slug}
    public function show(string $slug): JsonResponse
    {
        $product = Product::active()->with('category')->where('slug', $slug)->firstOrFail();
        return response()->json($product);
    }

    // GET /api/products/{id}/reviews
    public function reviews(int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $reviews = $product->reviews()->with('user')->get()
            ->map(fn ($r) => $r->toApiArray());

        return response()->json($reviews);
    }
}
