<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It is a breeze. Simply tell Lumen the URIs it should respond to
| and give it the Closure to call when that URI is requested.
|
*/

$router->get('/', function () use ($router) {
    return $router->app->version();
});

$router->group(['prefix' => 'api'], function () use ($router) {
    // authenticate, verificate and token valid routes
    $router->group(['middleware' => ['auth', 'is-verified', 'token-expired']], function () use ($router) {
        // user routes when logged in
        $router->get('/users', 'UserController@index');
        $router->get('/users/{id}', 'UserController@show');
        $router->put('/users/{id}', 'UserController@update');
        $router->delete('/users/{id}', 'UserController@destroy');
    });

    // authenticate and verificate routes
    $router->group(['middleware' => ['auth', 'is-verified']], function () use ($router) {
        // get token route
        $router->get('/refresh-token', 'UserController@refresh_token');
    });

    // login route
    $router->post('/login', 'UserController@login');

    // user routes
    $router->post('/users', 'UserController@store');
    $router->get('/users/verification-account/{token}', ['as' => 'users.verification.account', 'uses' => 'UserController@verification_account']);
});
