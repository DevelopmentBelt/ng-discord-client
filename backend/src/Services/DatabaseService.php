<?php

namespace App\Services;

use PDO;

class DatabaseService {
  private PDO | null $pdo;
  public function __construct() {
    $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'localhost';
    $db = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'ng_discord';
    $user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'ng_discord';
    $pass = $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?: 'ng_discord';
    $charset = $_ENV['DB_CHARSET'] ?? getenv('DB_CHARSET') ?: 'utf8mb4';
    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";

    // PDO options
    $options = [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $this->pdo = new PDO($dsn, $user, $pass, $options);
  }
  public function getConnection(): PDO {
    return $this->pdo;
  }
  public function __destruct() {
    if ($this->pdo) {
      $this->pdo = null;
    }
  }
}
