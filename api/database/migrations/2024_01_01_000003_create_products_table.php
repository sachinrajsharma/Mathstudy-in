<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('short_desc', 255)->nullable();
            $table->longText('description')->nullable();
            $table->decimal('price', 8, 2);
            $table->decimal('original_price', 8, 2)->nullable();
            $table->string('cover_image')->nullable();   // relative path e.g. /images/products/abc.jpg
            $table->string('pdf_path')->nullable();      // stored outside public/ e.g. storage/ebooks/abc.pdf
            $table->unsignedSmallInteger('page_count')->nullable();
            $table->unsignedSmallInteger('preview_pages')->default(3); // SEO crawlable pages
            $table->string('grade')->nullable();         // e.g. "Grade 10"
            $table->string('board')->nullable();         // e.g. "CBSE"
            $table->string('meta_title', 70)->nullable();
            $table->string('meta_desc', 160)->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('downloads')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'is_featured']);
            $table->index('category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
