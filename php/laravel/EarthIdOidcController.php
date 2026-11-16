<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

final class EarthIdOidcController extends Controller
{
    public function start(Request $request): RedirectResponse
    {
        $configuration = $this->settings();
        $discovery = $this->discovery($configuration['issuer']);

        $state = bin2hex(random_bytes(32));
        $nonce = bin2hex(random_bytes(32));
        $verifier = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        $request->session()->put('earthid_oidc_transaction', [
            'state' => $state,
            'nonce' => $nonce,
            'verifier' => $verifier,
            'created_at' => time(),
        ]);

        $query = http_build_query([
            'response_type' => 'code',
            'client_id' => $configuration['client_id'],
            'redirect_uri' => $configuration['redirect_uri'],
            'scope' => 'openid profile email',
            'state' => $state,
            'nonce' => $nonce,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
        ], '', '&', PHP_QUERY_RFC3986);

        return redirect()->away($discovery['authorization_endpoint'].'?'.$query);
    }

    public function callback(Request $request): RedirectResponse
    {
        // Pull immediately: state, nonce and verifier can never be reused.
        $transaction = $request->session()->pull('earthid_oidc_transaction');

        if (! is_array($transaction)
            || ! is_string($request->query('state'))
            || ! is_string($transaction['state'] ?? null)
            || ! hash_equals($transaction['state'], $request->query('state'))
            || time() - (int) ($transaction['created_at'] ?? 0) > 600
            || (int) ($transaction['created_at'] ?? 0) > time() + 30
            || ! is_string($request->query('code'))
            || $request->query('code') === ''
            || $request->has('error')) {
            abort(400, 'OIDC authentication was cancelled or the login state is invalid.');
        }

        $configuration = $this->settings();
        $discovery = $this->discovery($configuration['issuer']);

        // Never log this response: it contains bearer tokens and personal data.
        $response = Http::asForm()
            ->withBasicAuth($configuration['client_id'], $configuration['client_secret'])
            ->timeout(15)
            ->post($discovery['token_endpoint'], [
                'grant_type' => 'authorization_code',
                'code' => $request->query('code'),
                'redirect_uri' => $configuration['redirect_uri'],
                'code_verifier' => $transaction['verifier'],
            ]);

        if (! $response->successful() || ! is_string($response->json('id_token'))) {
            abort(401, 'OIDC token exchange could not be completed.');
        }

        $idToken = $response->json('id_token');
        $claims = $this->validateIdToken(
            $idToken, $discovery, $configuration['issuer'], $configuration['client_id'],
            (string) $transaction['nonce']
        );

        $request->session()->regenerate();
        $request->session()->put('earthid_identity', [
            'issuer' => $configuration['issuer'],
            'sub' => $claims['sub'],
            'name' => is_string($claims['name'] ?? null) ? $claims['name'] : null,
            'email' => is_string($claims['email'] ?? null) ? $claims['email'] : null,
        ]);

        // APPLICATION-SPECIFIC STEP:
        // Resolve (issuer, sub) against your local user registry, verify status,
        // then apply app permissions. Do NOT auto-create business entities on login.
        return redirect()->route('earthid.profile');
    }

    public function profile(Request $request): JsonResponse|RedirectResponse
    {
        $identity = $request->session()->get('earthid_identity');

        if (! is_array($identity)) {
            return redirect()->route('earthid.login');
        }

        return response()->json([
            'issuer' => $identity['issuer'],
            'sub' => $identity['sub'],
            'name' => $identity['name'],
            'email' => $identity['email'],
        ])->header('Cache-Control', 'no-store');
    }

    public function logout(Request $request): RedirectResponse
    {
        // LOCAL logout only. End the provider SSO session separately if required.
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /** @return array{issuer:string,client_id:string,client_secret:string,redirect_uri:string} */
    private function settings(): array
    {
        $issuer = rtrim(trim((string) config('services.earthid.issuer')), '/');
        $clientId = trim((string) config('services.earthid.client_id'));
        $clientSecret = (string) config('services.earthid.client_secret');
        $redirectUri = trim((string) config('services.earthid.redirect_uri'));

        if (! str_starts_with($issuer, 'https://')
            || $clientId === '' || $clientSecret === '' || $redirectUri === ''
            || (! str_starts_with($redirectUri, 'https://')
                && ! str_starts_with($redirectUri, 'http://localhost:'))) {
            throw new RuntimeException('EarthID confidential client configuration is missing or invalid.');
        }

        return compact('issuer', 'clientId', 'clientSecret', 'redirectUri') + [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
        ];
    }

    /** @return array<string, mixed> */
    private function discovery(string $issuer): array
    {
        return Cache::remember('earthid_discovery:'.hash('sha256', $issuer), 900, function () use ($issuer): array {
            $metadata = Http::acceptJson()->timeout(10)
                ->get($issuer.'/.well-known/openid-configuration')->throw()->json();

            if (! is_array($metadata) || ($metadata['issuer'] ?? null) !== $issuer) {
                throw new RuntimeException('OIDC issuer does not match configured issuer.');
            }
            foreach (['authorization_endpoint', 'token_endpoint', 'jwks_uri'] as $key) {
                if (! is_string($metadata[$key] ?? null)
                    || ! str_starts_with($metadata[$key], 'https://')) {
                    throw new RuntimeException('OIDC discovery is missing a secure protocol endpoint.');
                }
            }

            return $metadata;
        });
    }

    /**
     * @param array<string, mixed> $discovery
     * @return array<string, mixed>
     */
    private function validateIdToken(
        string $idToken,
        array $discovery,
        string $issuer,
        string $clientId,
        string $expectedNonce
    ): array {
        $parts = explode('.', $idToken);
        $header = count($parts) === 3
            ? json_decode((string) base64_decode(strtr($parts[0], '-_', '+/'), true), true)
            : null;

        // Pin the algorithm published for this deployment's OIDC ID tokens.
        // If another algorithm is officially advertised, review before enabling it.
        if (! is_array($header) || ($header['alg'] ?? null) !== 'RS256') {
            abort(401, 'OIDC ID token algorithm is not accepted.');
        }

        $cacheKey = 'earthid_jwks:'.hash('sha256', (string) $discovery['jwks_uri']);

        $readJwks = static function () use ($discovery): array {
            $keys = Http::acceptJson()->timeout(10)
                ->get($discovery['jwks_uri'])->throw()->json();

            if (! is_array($keys) || ! is_array($keys['keys'] ?? null)) {
                throw new RuntimeException('OIDC JWKS response is invalid.');
            }

            return $keys;
        };

        try {
            $jwks = Cache::remember($cacheKey, 300, $readJwks);
            JWT::$leeway = 30;
            $claims = (array) JWT::decode($idToken, JWK::parseKeySet($jwks, 'RS256'));
        } catch (Throwable $error) {
            // A rotated signing key may not be in the cached JWKS.
            Cache::forget($cacheKey);
            try {
                $jwks = Cache::remember($cacheKey, 300, $readJwks);
                $claims = (array) JWT::decode($idToken, JWK::parseKeySet($jwks, 'RS256'));
            } catch (Throwable $retryError) {
                abort(401, 'OIDC ID token signature or validity could not be verified.');
            }
        }

        $audience = $claims['aud'] ?? null;
        $audienceValid = is_string($audience)
            ? hash_equals($clientId, $audience)
            : (is_array($audience) && in_array($clientId, $audience, true));

        if (($claims['iss'] ?? null) !== $issuer
            || ! $audienceValid
            || ! is_string($claims['sub'] ?? null)
            || $claims['sub'] === ''
            || ! is_string($claims['nonce'] ?? null)
            || ! hash_equals($expectedNonce, $claims['nonce'])
            || (isset($claims['azp']) && $claims['azp'] !== $clientId)
            || ! isset($claims['iat'])
            || ! isset($claims['exp'])) {
            abort(401, 'OIDC ID token claims did not satisfy the client policy.');
        }

        return $claims;
    }
}
