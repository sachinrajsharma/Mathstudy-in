<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id', 'transaction_id', 'total_amount', 'status', 'upi_ref', 'notes', 'paid_at',
    ];

    protected $casts = [
        'total_amount' => 'float',
        'paid_at'      => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    /**
     * Mark order as paid and stamp the timestamp.
     */
    public function markPaid(string $upiRef = null): void
    {
        $this->update([
            'status'  => 'paid',
            'upi_ref' => $upiRef,
            'paid_at' => now(),
        ]);

        // Increment download count for each product
        foreach ($this->items as $item) {
            $item->product->increment('downloads');
        }
    }
}
