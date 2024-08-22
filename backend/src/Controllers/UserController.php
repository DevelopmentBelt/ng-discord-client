<?php

namespace App\Controllers;
session_start();

use App\Services\DatabaseService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserController extends Routes {
  protected function registerRoutes(): void
  {
    $this->app->post('/api/users/register', [$this, 'register']);
    $this->app->post('/api/users/login', [$this, 'login']);
  }

  public function register(Request $request, Response $response, $args) {
    $body = $request->getParsedBody();
    $email = $body['email'];
    $password = $body['password'];
    $username = $body['username'];
    $pdo = $this->dbService->getConnection();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE `email` = :email OR `user_name` = :username");
    $stmt->execute(['email' => $email, 'username' => $username]);
    $userOrEmailExists = $stmt->fetchColumn();
    if ($userOrEmailExists == 0) {
      $stmt = $pdo->prepare("INSERT INTO `users` (`email`, `user_name`, `password`) VALUES (:email, :username, :password)");
      $stmt->execute(['email' => $email, 'username' => $username, 'password' => $password]);
      $pdo->commit();
      $response->getBody()->write(json_encode(['status' => 'success', 'message' => 'Register successful']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } else {
      // Error, this username or email already exists...
      $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Username or Email already exists...']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
  }
  public function login(Request $request, Response $response, $args) {
    $body = $request->getParsedBody();
    $email = $body['email'];
    $password = $body['password'];
    $username = $body['username'];
    $pdo = $this->dbService->getConnection();
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE `email` = :email OR `user_name` = :username");
    $stmt->execute(['email' => $email, 'username' => $username]);
    $userOrEmailExists = $stmt->fetchColumn();
    if ($userOrEmailExists) {
      // Valid user, is password correct?
      $stmt = $pdo->prepare("SELECT `password`, `user_id` FROM `users` WHERE `email` = :email OR `user_name` = :username");
      $stmt->execute(['email' => $email, 'username' => $username]);
      $passwordRet = $stmt->fetchColumn('password');
      $userId = $stmt->fetchColumn('user_id');
      if (password_verify($password, $passwordRet)) {
        // Valid password
        $response->getBody()->write(json_encode(['status' => 'success', 'message' => 'Login successful']));
        $_SESSION['user_id'] = $userId;
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
      } else {
        // Not a valid password
        $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Invalid password']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
      }
    } else {
      // Not a valid user, inform them...
      $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'User not found']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }
  }
}
