<?php

namespace App\Models;

use PDO;

class Member
{
  private int $user_id;
  private int $server_id;
  private string $member_name;
  private string $status;

  private PDO $pdo;
  public function __construct(int $user_id, int $server_id, PDO $pdo, bool $returnMemberData = true, string $member_name = null, string $status = null) {
    $this->user_id = $user_id;
    $this->server_id = $server_id;
    $this->member_name = $member_name;
    $this->status = $status;
    $this->pdo = $pdo;
  }

  public function getUserId(): int {
    return $this->user_id;
  }

  public function getServerId(): int {
    return $this->server_id;
  }

  public function getMemberName(): string {
    return $this->member_name;
  }

  public function getStatus(): string {
    return $this->status;
  }
}
