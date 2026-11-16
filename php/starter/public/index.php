<?php

declare(strict_types=1);

use Dotenv\Dotenv;
use Jumbojett\OpenIDConnectClient;

require dirname(__DIR__).'/vendor/autoload.php';

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

function configValue(string $key): string
{
    $value = trim((string) ($_ENV[$key] ?? getenv($key) ?: ''));

    if ($value === '' || str_starts_with($value, 'replace-with-')) {
        throw new RuntimeException("Missing required configuration: {$key}");
    }

    return $value;
}

function escapeHtml(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function redirectLocal(string $path): never
{
    header('Location: '.$path, true, 303);
    exit;
}

function oidcClient(): OpenIDConnectClient
{
    $issuer = rtrim(configValue('EARTHID_ISSUER'), '/');
    $redirect = configValue('EARTHID_REDIRECT_URI');

    if (! str_starts_with($issuer, 'https://')) {
        throw new RuntimeException('EarthID issuer must use HTTPS');
    }

    if (! str_starts_with($redirect, 'https://')
        && ! str_starts_with($redirect, 'http://localhost:')) {
        throw new RuntimeException('Redirect URI must use HTTPS, except localhost development');
    }

    $client = new OpenIDConnectClient(
        $issuer,
        configValue('EARTHID_CLIENT_ID'),
        configValue('EARTHID_CLIENT_SECRET')
    );

    $client->setRedirectURL($redirect);
    $client->setResponseTypes(['code']);
    $client->setCodeChallengeMethod('S256');
    $client->addScope(['openid', 'profile', 'email']);

    // Library performs discovery, state/nonce checks and signed ID token verification.
    // Never disable TLS peer/host verification or accept unsigned JWT claims.
    return $client;
}

ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_name('earthid_php_demo');
$isHttps = ! empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($path === '/login' && $method === 'GET') {
        oidcClient()->authenticate(); // Redirects to EarthID for a new login.
        exit;
    }

    if ($path === '/callback' && $method === 'GET') {
        $client = oidcClient();
        $client->authenticate(); // Checks state, nonce, PKCE and signed ID token.

        $issuer = rtrim(configValue('EARTHID_ISSUER'), '/');
        $clientId = configValue('EARTHID_CLIENT_ID');
        $subject = $client->getVerifiedClaims('sub');
        $tokenIssuer = $client->getVerifiedClaims('iss');
        $audience = $client->getVerifiedClaims('aud');
        $authorizedParty = $client->getVerifiedClaims('azp');

        if (! is_string($subject) || $subject === ''
            || ! is_string($tokenIssuer) || ! hash_equals($issuer, $tokenIssuer)
            || ! (is_string($audience) && hash_equals($clientId, $audience)
                || is_array($audience) && in_array($clientId, $audience, true))
            || ($authorizedParty !== null && $authorizedParty !== $clientId)) {
            throw new RuntimeException('OIDC claims validation failed');
        }

        session_regenerate_id(true);
        $_SESSION['earthid_user'] = [
            'issuer' => $issuer,
            'sub' => $subject,
            'name' => is_string($client->getVerifiedClaims('name')) ? $client->getVerifiedClaims('name') : null,
            'email' => is_string($client->getVerifiedClaims('email')) ? $client->getVerifiedClaims('email') : null,
        ];
        redirectLocal('/profile');
    }

    if ($path === '/logout' && $method === 'POST') {
        $submitted = (string) ($_POST['_csrf'] ?? '');
        $expected = (string) ($_SESSION['csrf'] ?? '');
        if ($expected === '' || ! hash_equals($expected, $submitted)) {
            http_response_code(403);
            exit('Invalid request');
        }

        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000, 'path' => $p['path'],
                'domain' => $p['domain'], 'secure' => $p['secure'],
                'httponly' => $p['httponly'], 'samesite' => $p['samesite'],
            ]);
        }
        session_destroy();
        redirectLocal('/');
    }

    if ($path === '/profile' && $method === 'GET'
        && ! is_array($_SESSION['earthid_user'] ?? null)) {
        redirectLocal('/');
    }

    if ($path !== '/' && $path !== '/profile') {
        http_response_code(404);
        exit('Not found');
    }

    if ($method !== 'GET') {
        http_response_code(405);
        header('Allow: GET');
        exit('Method not allowed');
    }

    if (! isset($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }

    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store, private');
    $user = $_SESSION['earthid_user'] ?? null;
    $title = $path === '/profile' ? 'Protected profile' : 'EarthID PHP starter';
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'.escapeHtml($title)
        .'</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>'
        .'<body style="font-family:system-ui;max-width:700px;margin:3rem auto;padding:0 1rem">';
    echo '<h1>'.escapeHtml($title).'</h1>';
    if (is_array($user)) {
        echo '<p>Signed in with EarthID. Your application must still authorize each business action.</p>';
        foreach (['issuer', 'sub', 'name', 'email'] as $field) {
            echo '<p><strong>'.escapeHtml($field).':</strong> '.escapeHtml($user[$field] ?? null).'</p>';
        }
        echo '<form method="post" action="/logout"><input type="hidden" name="_csrf" value="'
            .escapeHtml($_SESSION['csrf']).'"><button>Sign out of this application</button></form>';
        echo '<p><a href="/profile">Protected page</a> &middot; <a href="/">Home</a></p>';
    } else {
        echo '<p>No local application session.</p><a href="/login">Sign in with EarthID</a>';
        echo '<p><a href="/profile">Open protected page (should redirect to home)</a></p>';
    }
    echo '<p><small>Local sign-out does not automatically terminate the EarthID SSO session.</small></p>';
    echo '</body></html>';
} catch (Throwable $error) {
    // Do not reflect exception messages or tokens back to the browser.
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    echo "Authentication request could not be completed. Verify your registration and contact the deployment administrator.";
}
