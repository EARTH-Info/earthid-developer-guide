<?php

declare(strict_types=1);

// Merge these lines into your existing routes/web.php.
// Laravel's web middleware supplies sessions and CSRF protection.
use App\Http\Controllers\Auth\EarthIdOidcController;
use Illuminate\Support\Facades\Route;

Route::get('/earthid/login', [EarthIdOidcController::class, 'start'])->name('earthid.login');
Route::get('/earthid/callback', [EarthIdOidcController::class, 'callback'])->name('earthid.callback');
Route::get('/earthid/profile', [EarthIdOidcController::class, 'profile'])->name('earthid.profile');
Route::post('/earthid/logout', [EarthIdOidcController::class, 'logout'])->name('earthid.logout');
