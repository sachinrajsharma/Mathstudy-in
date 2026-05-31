<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DownloadToken extends Model
{
    protected $fillable = [
        'order_item_id', 'user_id', 'product_id', 'token', 'uses', 'max_uses', 'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'uses'       => 'integer',
        'max_uses'   => 'integer',
    ];

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function isValid(): bool
    {
        return $this->uses < $this->max_uses && $this->expires_at->isFuture();
    }

    public function incrementUse(): void
    {
        $this->increment('uses');
    }
}
