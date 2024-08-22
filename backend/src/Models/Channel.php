<?php

namespace App\Models;

use PDO;

class Channel
{
  private int $channel_id;
  private int $category_id;
  private string $channel_name;
  private PDO $pdo;

  public function __construct(int $channel_id, PDO $pdo, bool $returnChannelData = true, int $category_id = null, string $channel_name = null) {
    $this->channel_id = $channel_id;
    $this->category_id = $category_id;
    $this->channel_name = $channel_name;
  }

  public function getChannelId(): int {
    return $this->channel_id;
  }

  public function getCategoryId(): int {
    return $this->category_id;
  }

  public function getChannelName(): string {
    return $this->channel_name;
  }
}
