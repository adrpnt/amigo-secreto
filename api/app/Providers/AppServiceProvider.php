<?php

namespace App\Providers;

use Illuminate\Contracts\Mail\Mailer;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot()
    {
        Schema::defaultStringLength(191);
    }

    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        $this->app->configure('cors');
        $this->app->configure('mail');

        $this->app->alias('mailer', Mailer::class);
    }
}
