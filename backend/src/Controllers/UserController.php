<?php

namespace App\Controllers;

use App\Services\DatabaseService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserController extends Routes {
  protected function registerRoutes() {
    $this->app->post('/users/register', [$this, 'register']);
    $this->app->post('/users/login', [$this, 'login']);
  }

  protected function register(Request $request, Response $response, $args) {
    $body = $request->getParsedBody();
    $email = $body['email'];
    $password = $body['password'];
    $username = $body['username'];
    $pdo = $this->dbService->getConnection();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE `email` = :email OR `username` = :username");
    $stmt->execute(['email' => $email, 'username' => $username]);
    $userOrEmailExists = $stmt->fetchColumn();
    if ($userOrEmailExists == 0) {
      $stmt = $pdo->prepare("INSERT INTO `users` (`email`, `username`, `password`) VALUES (:email, :username, :password)");
      $stmt->execute(['email' => $email, 'username' => $username, 'password' => $password]);
      $pdo->commit();
    } else {
      // TODO Error, this username or email already exists...
    }
    return null;
  }
  protected function login(Request $request, Response $response, $args) {
    $body = $request->getParsedBody();
    $email = $body['email'];
    $password = $body['password'];
    $username = $body['username'];
    $pdo = $this->dbService->getConnection();
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE `email` = :email OR `username` = :username");
    $stmt->execute(['email' => $email, 'username' => $username]);
    $userOrEmailExists = $stmt->fetchColumn();
    if ($userOrEmailExists) {
      // Valid user, is password correct?
      $stmt = $pdo->prepare("SELECT `password` FROM `users` WHERE `email` = :email OR `username` = :username");
      $stmt->execute(['email' => $email, 'username' => $username]);
      $passwordRet = $stmt->fetchColumn();
      if (password_verify($password, $passwordRet)) {
        // Valid password
        // TODO
      } else {
        // Not a valid password
        // TODO
      }
    } else {
      // Not a valid user, inform them...
      // TODO
    }
    return null;
  }
}
