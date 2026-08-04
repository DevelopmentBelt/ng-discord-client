<?php

namespace App\Models;

use PDO;
use Exception;

class User
{
  private int $user_id;
  private ?string $user_name;
  private ?string $user_bio;
  private ?string $user_pic;
  private string $profile_card = 'classic';
  private string $avatar_effect = 'none';
  private ?string $email;
  private bool $email_verified;

  private PDO $pdo;

  public function __construct(int $user_id, PDO $pdo, bool $returnUserData = true, ?string $user_name = null, ?string $user_bio = null, ?string $user_pic = null, ?string $email = null, bool $email_verified = false) {
    $this->user_id = $user_id;
    $this->user_name = $user_name;
    $this->user_bio = $user_bio;
    $this->user_pic = $user_pic;
    $this->email = $email;
    $this->email_verified = $email_verified;
    $this->pdo = $pdo;
    if ($returnUserData) {
      $query = "SELECT * FROM `users` WHERE `user_id` = ?";
      $stmt = $this->pdo->prepare($query);
      $stmt->execute([$user_id]);
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($row) {
        $this->user_name = $row['user_name'] ?? null;
        $this->user_bio = $row['user_bio'] ?? null;
        $this->user_pic = $row['user_pic'] ?? null;
        $this->profile_card = $row['profile_card'] ?? 'classic';
        $this->avatar_effect = $row['avatar_effect'] ?? 'none';
        $this->email = $row['email'] ?? null;
        $this->email_verified = (bool)($row['email_verified'] ?? false);
      }
    }
  }

  public function getServers(): array {
    try {
      $query = "SELECT s.* FROM `servers` s
                    INNER JOIN `members` m ON m.server_id = s.server_id
                    INNER JOIN `users` u ON m.user_id = u.user_id
                    WHERE u.user_id = ?";
      $stmt = $this->pdo->prepare($query);
      $stmt->execute([$this->user_id]);
      $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
      error_log("User::getServers query executed, found " . count($result) . " servers");
      return $result;
    } catch (Exception $e) {
      error_log("Error in User::getServers: " . $e->getMessage());
      return [];
    }
  }

  public function getUserId(): int {
    return $this->user_id;
  }

  public function getName(): ?string {
    return $this->user_name;
  }

  public function getBio(): ?string {
    return $this->user_bio;
  }

  public function getPic(): ?string {
    return $this->user_pic;
  }

  public function getProfileCard(): string {
    return $this->profile_card ?: 'classic';
  }

  public function getAvatarEffect(): string {
    return $this->avatar_effect ?: 'none';
  }

  public function getEmail(): ?string {
    return $this->email;
  }

  public function getEmailVerified(): bool {
    return $this->email_verified;
  }
}
