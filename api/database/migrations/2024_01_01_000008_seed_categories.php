<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Seed the 16 standard MathStudy.in categories on first deploy.
 * This is a migration rather than a seeder so it runs atomically with
 * the schema creation on `php artisan migrate --seed` equivalent.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $categories = [
            ['name' => 'Primary Maths (Grade 1–5)',  'slug' => 'primary-maths',  'sort_order' => 1],
            ['name' => 'Middle School (Grade 6–8)',   'slug' => 'middle-maths',   'sort_order' => 2],
            ['name' => 'CBSE Grade 9–10',             'slug' => 'cbse-9-10',      'sort_order' => 3],
            ['name' => 'CBSE Grade 11–12',            'slug' => 'cbse-11-12',     'sort_order' => 4],
            ['name' => 'ICSE Maths',                  'slug' => 'icse',           'sort_order' => 5],
            ['name' => 'JEE Main & Advanced',         'slug' => 'jee',            'sort_order' => 6],
            ['name' => 'CUET Maths',                  'slug' => 'cuet',           'sort_order' => 7],
            ['name' => 'CAT Quantitative Aptitude',   'slug' => 'cat-quant',      'sort_order' => 8],
            ['name' => 'Worksheets',                  'slug' => 'worksheets',     'sort_order' => 9],
            ['name' => 'Sample Papers',               'slug' => 'sample-papers',  'sort_order' => 10],
            ['name' => 'Case Studies',                'slug' => 'case-studies',   'sort_order' => 11],
            ['name' => 'Revision Notes',              'slug' => 'revision-notes', 'sort_order' => 12],
            ['name' => 'Olympiad (IMO/NSO)',          'slug' => 'olympiad',       'sort_order' => 13],
            ['name' => 'NDA Maths',                   'slug' => 'nda',            'sort_order' => 14],
            ['name' => 'Vedic Maths',                 'slug' => 'vedic-maths',    'sort_order' => 15],
            ['name' => 'Mental Maths',                'slug' => 'mental-maths',   'sort_order' => 16],
        ];

        foreach ($categories as &$cat) {
            $cat['created_at'] = $now;
            $cat['updated_at'] = $now;
        }

        DB::table('categories')->insertOrIgnore($categories);
    }

    public function down(): void
    {
        // Safe — only removes seeded rows if slug matches
        DB::table('categories')->whereIn('slug', [
            'primary-maths','middle-maths','cbse-9-10','cbse-11-12','icse','jee',
            'cuet','cat-quant','worksheets','sample-papers','case-studies',
            'revision-notes','olympiad','nda','vedic-maths','mental-maths',
        ])->delete();
    }
};
