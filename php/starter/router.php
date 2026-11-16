<?php

declare(strict_types=1);

// Built-in server router for the local demo only. Use a real web server in production.
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (is_file(__DIR__.'/public'.$path)) {
    return false;
}

require __DIR__.'/public/index.php';
