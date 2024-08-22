<?php

namespace App\Models;

use PDO;

class Server
{
  private int $server_id;
  private string $server_name;
  private string $server_description;
  private string $server_icon;
  private int $owner_id;

  private array $categories;
  private array $members;
  private PDO $pdo;

  public function __construct(int $server_id, PDO $pdo, bool $returnServerData = true, string $server_name = null, string $server_description = null, string $server_icon = null, int $owner_id = null) {
    $this->server_id = $server_id;
    $this->server_name = $server_name;
    $this->server_description = $server_description;
    $this->server_icon = $server_icon;
    $this->owner_id = $owner_id;
    $this->pdo = $pdo;
    $query = "SELECT category_id, category_name, category_icon FROM categories c WHERE server_id = ?";
    $stmt = $this->pdo->prepare($query);
    $stmt->execute([$server_id]);
    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $cs = [];
    foreach ($res as $row) {
      if ($row['category_id'] != null) {
        $c = new Category(
          $row['category_id'],
          $row['server_id'],
          $pdo,
          false,
          $row['category_name'],
          $row['category_icon']
        );
        $cs[] = $c;
      }
    }
    $this->categories = $cs;
    if ($returnServerData) {
      // TODO Get data with server_id
    }
  }

  public function getServerId(): int {
    return $this->server_id;
  }

  public function getServerName(): string {
    return $this->server_name;
  }

  public function getServerDescription(): string {
    return $this->server_description;
  }

  public function getServerIcon(): string {
    return $this->server_icon;
  }

  public function getOwnerId(): int {
    return $this->owner_id;
  }
}
