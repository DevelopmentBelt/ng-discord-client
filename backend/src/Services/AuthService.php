<?php

namespace App\Services;

use App\Models\User;
use PDO;

class AuthService
{
  public static function getUserId(): ?int
  {
    if (empty($_SESSION['user_id'])) {
      return null;
    }
    return (int) $_SESSION['user_id'];
  }

  public static function requireUserId(): ?int
  {
    return self::getUserId();
  }

  public static function login(int $userId): void
  {
    $_SESSION['user_id'] = $userId;
  }

  public static function logout(): void
  {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
      $params = session_get_cookie_params();
      setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
  }

  public static function userToArray(User $user): array
  {
    return [
      'id' => $user->getUserId(),
      'username' => $user->getName(),
      'email' => $user->getEmail(),
      'userPic' => $user->getPic() ?? '',
      'userBio' => $user->getBio() ?? '',
      'profileCard' => $user->getProfileCard(),
      'avatarEffect' => $user->getAvatarEffect(),
      'emailVerified' => $user->getEmailVerified(),
    ];
  }

  public static function loadUser(PDO $pdo, int $userId): ?User
  {
    $user = new User($userId, $pdo, true);
    if ($user->getName() === null && $user->getEmail() === null) {
      return null;
    }
    return $user;
  }
}
