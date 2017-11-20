<?php

namespace App\Http\Middleware;

use Carbon\Carbon;

use Closure;

class IsVerifiedMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        if (!$request->user()->verified_at) {
            return response()->json(['error' => true, 'message' => 'User not verified.'], 403);
        }

        return $next($request);
    }
}
