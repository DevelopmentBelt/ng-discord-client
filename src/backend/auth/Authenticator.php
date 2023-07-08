<?php

class Authenticator {
  private bool $isAuthenticated = false;
  public function __construct() {}
  public function isAuthenticated(): bool {
    return $this->isAuthenticated;
  }
  public function authenticate() {
    $this->isAuthenticated = true;
  }
}
