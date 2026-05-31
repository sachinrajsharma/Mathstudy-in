<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('download_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('token', 80)->unique();
            $table->unsignedSmallInteger('uses')->default(0);
            $table->unsignedSmallInteger('max_uses')->default(5);
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index('token');
            $table->index(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('download_tokens');
    }
};
