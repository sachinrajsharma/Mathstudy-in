<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'title', 'slug', 'short_desc', 'description',
        'price', 'original_price', 'cover_image', 'pdf_path',
        'page_count', 'preview_pages', 'grade', 'board',
        'meta_title', 'meta_desc', 'is_featured', 'is_active', 'downloads',
    ];

    protected $casts = [
        'price'          => 'float',
        'original_price' => 'float',
        'is_featured'    => 'boolean',
        'is_active'      => 'boolean',
        'page_count'     => 'integer',
        'preview_pages'  => 'integer',
        'downloads'      => 'integer',
    ];

    protected $hidden = ['pdf_path']; // never expose the real file path via API

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class)->where('is_approved', true)->latest();
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }
}
