<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Draw extends Model
{
    protected $fillable = ['title', 'min_value', 'max_value', 'image' 'status'];

    public function users()
    {
        return $this->belongsToMany('App\User');
    }
}
