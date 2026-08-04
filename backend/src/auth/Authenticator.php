<?php

namespace App\Auth;

use App\Services\AuthService;

/**
 * Thin wrapper around session-based AuthService.
 */
class Authenticator
{
  public function isAuthenticated(): bool
  {
    return AuthService::getUserId() !== null;
  }

  public function getUserId(): ?int
  {
    return AuthService::getUserId();
  }
}
