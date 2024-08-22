<?php

namespace App\Models;

use PDO;

class Category
{
  private int $category_id;
  private int $server_id;
  private string $category_name;
  private string $category_icon;

  private array $channels;

  private PDO $pdo;

  public function __construct(int $category_id, PDO $pdo, bool $returnCategoryData = true, int $server_id = null, string $category_name = null, string $category_icon = null) {
    $this->category_id = $category_id;
    $this->server_id = $server_id;
    $this->category_name = $category_name;
    $this->category_icon = $category_icon;
    $this->pdo = $pdo;
    $this->channels = [];
    $query = "SELECT * FROM channels WHERE category_id = ?";
    $stmt = $this->pdo->prepare($query);
    $stmt->execute([$category_id]);
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($result as $row) {
      $chan = new Channel(
        $row['channel_id'],
        $pdo,
        false,
        $row['category_id'],
        $row['channel_name']
      );
      $this->channels[] = $chan;
    }
    if ($returnCategoryData) {
      //TODO We need to return the data based off category_id
    }
  }

  public function getCategoryId(): int {
    return $this->category_id;
  }

  public function getServerId(): int {
    return $this->server_id;
  }

  public function getCategoryName(): string {
    return $this->category_name;
  }

  public function getCategoryIcon(): string {
    return $this->category_icon;
  }
}
