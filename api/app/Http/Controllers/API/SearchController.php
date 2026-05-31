<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    // GET /api/search/suggest?q=...
    public function suggest(Request $request): JsonResponse
    {
        $q = trim($request->get('q', ''));

        if (strlen($q) < 2) {
            return response()->json([]);
        }

        $products = Product::active()
            ->where(function ($sub) use ($q) {
                $sub->where('title', 'like', "%{$q}%")
                    ->orWhere('grade', 'like', "%{$q}%");
            })
            ->select('id', 'title', 'slug')
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'type'  => 'product',
                'title' => $p->title,
                'slug'  => $p->slug,
                'url'   => "/ebooks/{$p->slug}",
            ]);

        $categories = Category::where('name', 'like', "%{$q}%")
            ->select('id', 'name', 'slug')
            ->limit(3)
            ->get()
            ->map(fn ($c) => [
                'type'  => 'category',
                'title' => $c->name,
                'slug'  => $c->slug,
                'url'   => "/category/{$c->slug}",
            ]);

        return response()->json($products->merge($categories)->values());
    }
}
