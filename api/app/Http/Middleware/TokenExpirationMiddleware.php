<?php

namespace App\Http\Middleware;

use Carbon\Carbon;

use Closure;

class TokenExpirationMiddleware
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
        $expired_at = $request->user()->expired_at;

        if ($expired_at->lessThan(Carbon::now())) {
            return response()->json(['error' => true, 'message' => 'Token expired.'], 401);
        }

        return $next($request);
    }
}
