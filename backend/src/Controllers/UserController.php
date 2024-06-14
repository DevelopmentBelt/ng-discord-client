<?php

namespace App\Controllers;

use App\Services\DatabaseService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserController extends Routes {
  protected function registerRoutes() {
    $this->app->post('users/register', [$this, 'register']);
    $this->app->post('users/login', [$this, 'login']);
  }

  protected function register(Request $request, Response $response, $args) {
    $body = $request->getParsedBody();
    $email = $body['email'];
    $password = $body['password'];
    $username = $body['username'];
  }
  protected function login(Request $request, Response $response, $args) {
    $body = $request->getParsedBody();
    $email = $body['email'];
    $password = $body['password'];
    $username = $body['username'];
  }
}
