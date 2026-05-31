<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'google_id', 'role', 'email_verified',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified' => 'boolean',
        'password'       => 'hashed',
    ];

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function downloadTokens()
    {
        return $this->hasMany(DownloadToken::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Return all products the user has successfully purchased.
     */
    public function purchasedProducts()
    {
        return Product::whereHas('orderItems.order', function ($q) {
            $q->where('user_id', $this->id)->where('status', 'paid');
        });
    }

    public function hasPurchased(int $productId): bool
    {
        return Order::where('user_id', $this->id)
            ->where('status', 'paid')
            ->whereHas('items', fn ($q) => $q->where('product_id', $productId))
            ->exists();
    }
}
