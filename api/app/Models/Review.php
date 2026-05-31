<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = ['product_id', 'user_id', 'rating', 'body', 'is_approved'];

    protected $casts = [
        'rating'      => 'integer',
        'is_approved' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // API resource shape
    public function toApiArray(): array
    {
        return [
            'id'         => $this->id,
            'author'     => $this->user->name ?? 'Anonymous',
            'rating'     => $this->rating,
            'body'       => $this->body,
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
