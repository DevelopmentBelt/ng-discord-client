<?php

namespace App\Services;

use PDO;

class DatabaseService {
  private PDO | null $pdo;
  public function __construct() {
    $host = $_ENV['DB_HOST'];
    $db   = $_ENV['DB_NAME'];
    $user = $_ENV['DB_USER'];
    $pass = $_ENV['DB_PASS'];
    $charset = $_ENV['DB_CHARSET'];
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
