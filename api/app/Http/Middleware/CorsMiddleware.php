<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Simple CORS middleware for the API.
 * Laravel 11 uses bootstrap/app.php for middleware registration.
 * Add this via: ->withMiddleware(function (Middleware $m) { $m->api(append: [CorsMiddleware::class]); })
 */
class CorsMiddleware
{
    private array $allowed;

    public function __construct()
    {
        $frontend = config('app.frontend_url', 'https://mathstudy.in');
        $this->allowed = array_filter([
            $frontend,
            'https://mathstudy.in',
            'https://www.mathstudy.in',
        ]);
    }

    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('Origin', '');

        $response = $next($request);

        if (in_array($origin, $this->allowed, true)) {
            $response->headers->set('Access-Control-Allow-Origin',      $origin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Allow-Methods',     'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers',     'Content-Type, Authorization, X-Requested-With');
        }

        if ($request->isMethod('OPTIONS')) {
            $response->setStatusCode(204);
            $response->setContent('');
        }

        return $response;
    }
}
