<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // POST /api/auth/register
    public function register(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|max:72',
        ]);

        if ($v->fails()) {
            return response()->json(['message' => $v->errors()->first()], 422);
        }

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => $request->password, // cast to hashed
        ]);

        $token = $user->createToken('ms_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->userPayload($user),
        ], 201);
    }

    // POST /api/auth/login
    public function login(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if ($v->fails()) {
            return response()->json(['message' => $v->errors()->first()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid email or password.'], 401);
        }

        // Revoke old tokens (single-session; remove this line to allow multiple devices)
        $user->tokens()->delete();

        $token = $user->createToken('ms_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->userPayload($user),
        ]);
    }

    // POST /api/auth/logout  (requires auth)
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out.']);
    }

    // GET /api/auth/me  (requires auth)
    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userPayload($request->user()));
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private function userPayload(User $user): array
    {
        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role'  => $user->role,
        ];
    }
}
