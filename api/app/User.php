<?php

namespace App;

use Illuminate\Auth\Authenticatable;
use Laravel\Lumen\Auth\Authorizable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Contracts\Auth\Access\Authorizable as AuthorizableContract;

class User extends Model implements AuthenticatableContract, AuthorizableContract
{
    use Authenticatable, Authorizable, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'gender', 'birthday', 'avatar', 'status'];
    protected $hidden = ['password', 'api_token', 'verification_token', 'expired_at', 'verified_at'];
    protected $dates = ['expired_at', 'verified_at'];

    public function setPasswordAttribute($value)
    {
        $this->attributes['password'] = Hash::make($value);
    }

    public function gifts()
    {
        return $this->hasMany('App\Gift');
    }

    public function draws()
    {
        return $this->belongsToMany('App\Draw');
    }
}
