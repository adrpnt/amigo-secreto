<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

use Carbon\Carbon;

use App\User;
use App\Notifications\AccountCreated;

class UserController extends Controller
{
    public function index() {
        return User::paginate();
    }

    public function show($id) {
        return User::find($id);
    }

    public function store(Request $request) {
        $this->validate($request, [
            'name' => 'required|max:255',
            'email' => 'required|max:100|email|unique:users',
            'password' => 'required|min:6|max:16'
        ]);

        $user = User::create($request->all());

        $user->verification_token = md5(str_random(16));
        $user->save();

        $url_verification = route('users.verification.account', ['token' => $user->verification_token]);
        $user->notify(new AccountCreated($user, $url_verification));

        return response()->json($user, 201);
    }

    public function update(Request $request, $id) {
        $this->validate($request, [
            'name' => 'required|max:255',
            'email' => 'required|max:100|email',
            'password' => 'min:6|max:16'
        ]);

        $user = User::find($id);

        $user->update($request->all());

        return $user;
    }

    public function destroy($id) {
        $user = User::find($id);

        $user->delete();

        return $user;
    }

    public function login(Request $request) {
        $this->validate($request, [
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $user = User::where('email', '=', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['error' => true, 'message' => 'Invalid Credentials.'], 400);
        }

        $token_info = $this->_generateToken();

        $user->api_token = $token_info['api_token'];
        $user->expired_at = $token_info['expired_at'];
        $user->save();

        return ['api_token' => $user->api_token, 'expired_at' => $user->expired_at->format('d/m/Y H:i:s')];
    }

    public function verification_account(Request $request, $verification_token) {
        $user = User::where('verification_token', '=', $verification_token)->first();

        if (!$user) {
            return response()->json(['error' => true, 'message' => 'Account already validated or invalid token.'], 400);
        }

        $user->status = true;
        $user->verification_token = null;
        $user->verified_at = Carbon::now();
        $user->save();

        return ['error' => false, 'message' => 'Account verified.'];
    }

    public function refresh_token(Request $request) {
        $user = $request->user();
        $token_info = $this->_generateToken();

        $user->api_token = $token_info['api_token'];
        $user->expired_at = $token_info['expired_at'];
        $user->save();

        return ['api_token' => $user->api_token, 'expired_at' => $user->expired_at->format('d/m/Y H:i:s')];
    }

    private function _generateToken() {
        $api_token = sha1(str_random(32)).'.'.sha1(str_random(32));
        $expired_at = Carbon::now()->addHour(2);

        return ['api_token' => $api_token, 'expired_at' => $expired_at];
    }
}
