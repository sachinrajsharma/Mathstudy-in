<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('transaction_id')->unique();   // MS + random alphanumeric
            $table->decimal('total_amount', 8, 2);
            $table->enum('status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');
            $table->string('upi_ref')->nullable();        // UTR from bank, collected manually or via webhook
            $table->text('notes')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('transaction_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
