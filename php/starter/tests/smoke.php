<?php

declare(strict_types=1);

require dirname(__DIR__).'/vendor/autoload.php';

if (! class_exists(\Jumbojett\OpenIDConnectClient::class)) {
    throw new RuntimeException('OIDC client dependency missing');
}
if (! class_exists(\Dotenv\Dotenv::class)) {
    throw new RuntimeException('dotenv dependency missing');
}

echo "Dependencies loaded. Live EarthID authentication requires an approved client.\n";
