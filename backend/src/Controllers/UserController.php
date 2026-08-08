<?php

namespace App\Controllers;

use App\Services\AuthService;
use App\Services\MailService;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserController extends Routes
{
  private const RESET_TOKEN_TTL_SECONDS = 3600;

  protected function registerRoutes(): void
  {
    $this->app->post('/api/users/register', [$this, 'register']);
    $this->app->post('/api/users/login', [$this, 'login']);
    $this->app->post('/api/users/logout', [$this, 'logout']);
    $this->app->post('/api/users/forgot-password', [$this, 'forgotPassword']);
    $this->app->post('/api/users/reset-password', [$this, 'resetPassword']);
    $this->app->get('/api/users/me', [$this, 'me']);
    $this->app->put('/api/users/me', [$this, 'updateProfile']);
    $this->app->put('/api/users/me/public-key', [$this, 'publishPublicKey']);
    $this->app->put('/api/users/me/dm-privacy', [$this, 'updateDmPrivacy']);
    $this->app->get('/api/users/me/dm-allowlist', [$this, 'listDmAllowlist']);
    $this->app->post('/api/users/me/dm-allowlist', [$this, 'addDmAllowlist']);
    $this->app->delete('/api/users/me/dm-allowlist/{targetUserId}', [$this, 'removeDmAllowlist']);
    $this->app->get('/api/users/me/key-vault', [$this, 'getKeyVault']);
    $this->app->put('/api/users/me/key-vault', [$this, 'putKeyVault']);
    $this->app->delete('/api/users/me/key-vault', [$this, 'deleteKeyVault']);
    $this->app->get('/api/users/search', [$this, 'search']);
  }

  public function register(Request $request, Response $response, $args): Response
  {
    $body = $request->getParsedBody() ?? [];
    $email = trim((string) ($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $username = trim((string) ($body['username'] ?? ''));

    if ($email === '' || $username === '' || $password === '') {
      return $this->json($response, ['status' => 'error', 'message' => 'Email, username, and password are required'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
      return $this->json($response, ['status' => 'error', 'message' => 'Invalid email address'], 400);
    }
    if (strlen($username) < 3 || strlen($username) > 32) {
      return $this->json($response, ['status' => 'error', 'message' => 'Username must be 3-32 characters'], 400);
    }
    if (!preg_match('/^[a-zA-Z0-9._-]+$/', $username)) {
      return $this->json($response, ['status' => 'error', 'message' => 'Username may only contain letters, numbers, dots, underscores, and hyphens'], 400);
    }
    if (strlen($password) < 6) {
      return $this->json($response, ['status' => 'error', 'message' => 'Password must be at least 6 characters'], 400);
    }

    $pdo = $this->dbService->getConnection();
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email OR user_name = :username');
    $stmt->execute(['email' => $email, 'username' => $username]);
    if ((int) $stmt->fetchColumn() > 0) {
      return $this->json($response, ['status' => 'error', 'message' => 'Username or email already exists'], 409);
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (email, user_name, password, email_verified) VALUES (:email, :username, :password, 0)');
    $stmt->execute([
      'email' => $email,
      'username' => $username,
      'password' => $hashedPassword,
    ]);

    $userId = (int) $pdo->lastInsertId();
    AuthService::login($userId);
    $user = AuthService::loadUser($pdo, $userId);

    return $this->json($response, [
      'status' => 'success',
      'message' => 'Registration successful',
      'user' => AuthService::userToArray($user),
    ], 201);
  }

  public function login(Request $request, Response $response, $args): Response
  {
    $body = $request->getParsedBody() ?? [];
    $password = (string) ($body['password'] ?? '');
    $email = trim((string) ($body['email'] ?? ''));
    $username = trim((string) ($body['username'] ?? ''));
    $identifier = $email !== '' ? $email : $username;

    if ($identifier === '' || $password === '') {
      return $this->json($response, ['status' => 'error', 'message' => 'Credentials are required'], 400);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensureProfileExtraColumns($pdo);
    $stmt = $pdo->prepare(
      'SELECT user_id, password
       FROM users
       WHERE email = :email OR user_name = :username
       LIMIT 1'
    );
    $stmt->execute(['email' => $identifier, 'username' => $identifier]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || !password_verify($password, $row['password'])) {
      return $this->json($response, ['status' => 'error', 'message' => 'Invalid username/email or password'], 401);
    }

    $userId = (int) $row['user_id'];
    AuthService::login($userId);
    $user = AuthService::loadUser($pdo, $userId);
    if (!$user) {
      return $this->json($response, ['status' => 'error', 'message' => 'Login failed'], 500);
    }

    return $this->json($response, [
      'status' => 'success',
      'message' => 'Login successful',
      'user' => AuthService::userToArray($user),
    ]);
  }

  public function logout(Request $request, Response $response, $args): Response
  {
    AuthService::logout();
    // Restart session so subsequent requests still have a session cookie jar
    if (session_status() !== PHP_SESSION_ACTIVE) {
      session_start();
    }
    return $this->json($response, ['status' => 'success', 'message' => 'Logged out']);
  }

  public function forgotPassword(Request $request, Response $response, $args): Response
  {
    $body = $request->getParsedBody() ?? [];
    $email = trim((string) ($body['email'] ?? ''));

    $generic = [
      'status' => 'success',
      'message' => 'If an account exists for that email, password reset instructions have been sent.',
    ];

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
      return $this->json($response, $generic);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensurePasswordResetTable($pdo);

    $stmt = $pdo->prepare('SELECT user_id, email FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
    $stmt->execute(['email' => $email]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      return $this->json($response, $generic);
    }

    $userId = (int) $row['user_id'];
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expiresAt = date('Y-m-d H:i:s', time() + self::RESET_TOKEN_TTL_SECONDS);

    $pdo->prepare('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = :user_id AND used_at IS NULL')
      ->execute(['user_id' => $userId]);

    $insert = $pdo->prepare(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (:user_id, :token_hash, :expires_at)'
    );
    $insert->execute([
      'user_id' => $userId,
      'token_hash' => $tokenHash,
      'expires_at' => $expiresAt,
    ]);

    $frontendUrl = rtrim((string) ($_ENV['FRONTEND_URL'] ?? getenv('FRONTEND_URL') ?: 'http://localhost:4200'), '/');
    $resetUrl = $frontendUrl . '/?resetToken=' . urlencode($token);

    MailService::sendPasswordReset((string) $row['email'], $resetUrl);

    // Local/dev (MAIL_DRIVER=log): return the link so reset works without SMTP.
    if (MailService::isLogDriver()) {
      $generic['resetUrl'] = $resetUrl;
      $generic['devHint'] = 'Email delivery is in log mode. Use resetUrl or check backend/storage/password-resets.log';
    }

    return $this->json($response, $generic);
  }

  public function resetPassword(Request $request, Response $response, $args): Response
  {
    $body = $request->getParsedBody() ?? [];
    $token = trim((string) ($body['token'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    if ($token === '' || strlen($token) < 32) {
      return $this->json($response, ['status' => 'error', 'message' => 'Invalid or expired reset link'], 400);
    }
    if (strlen($password) < 6) {
      return $this->json($response, ['status' => 'error', 'message' => 'Password must be at least 6 characters'], 400);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensurePasswordResetTable($pdo);

    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare(
      'SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = :token_hash
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1'
    );
    $stmt->execute(['token_hash' => $tokenHash]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      return $this->json($response, ['status' => 'error', 'message' => 'Invalid or expired reset link'], 400);
    }

    $userId = (int) $row['user_id'];
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $pdo->beginTransaction();
    try {
      $pdo->prepare('UPDATE users SET password = :password WHERE user_id = :user_id')
        ->execute(['password' => $hashedPassword, 'user_id' => $userId]);
      $pdo->prepare('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = :id')
        ->execute(['id' => (int) $row['id']]);
      $pdo->prepare('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = :user_id AND used_at IS NULL')
        ->execute(['user_id' => $userId]);
      $pdo->commit();
    } catch (\Throwable $e) {
      $pdo->rollBack();
      return $this->json($response, ['status' => 'error', 'message' => 'Could not reset password. Please try again.'], 500);
    }

    return $this->json($response, [
      'status' => 'success',
      'message' => 'Password updated. You can log in with your new password.',
    ]);
  }

  public function me(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensureProfileExtraColumns($pdo);
    $user = AuthService::loadUser($pdo, $userId);
    if (!$user) {
      AuthService::logout();
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    return $this->json($response, [
      'status' => 'success',
      'user' => AuthService::userToArray($user),
    ]);
  }

  public function updateProfile(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $body = $request->getParsedBody() ?? [];
    $username = trim((string) ($body['username'] ?? ''));
    $userBio = trim((string) ($body['userBio'] ?? ''));
    $userPic = trim((string) ($body['userPic'] ?? ''));
    $displayName = trim((string) ($body['displayName'] ?? ''));
    $pronouns = trim((string) ($body['pronouns'] ?? ''));
    $customStatus = trim((string) ($body['customStatus'] ?? ''));
    $bannerUrl = trim((string) ($body['bannerUrl'] ?? ''));
    $presenceStatus = trim((string) ($body['presenceStatus'] ?? 'online'));
    $profileCard = trim((string) ($body['profileCard'] ?? 'classic'));
    $avatarEffect = trim((string) ($body['avatarEffect'] ?? 'none'));

    $allowedCards = ['classic', 'midnight', 'aurora', 'ember', 'ocean', 'neon', 'forest', 'sunset'];
    $allowedEffects = ['none', 'ring', 'glow', 'pulse', 'rainbow', 'holo'];
    $allowedPresence = ['online', 'idle', 'dnd', 'invisible'];

    if ($username === '') {
      return $this->json($response, ['status' => 'error', 'message' => 'Username is required'], 400);
    }
    if (strlen($username) < 3 || strlen($username) > 32) {
      return $this->json($response, ['status' => 'error', 'message' => 'Username must be 3-32 characters'], 400);
    }
    if (!preg_match('/^[a-zA-Z0-9._-]+$/', $username)) {
      return $this->json($response, ['status' => 'error', 'message' => 'Username may only contain letters, numbers, dots, underscores, and hyphens'], 400);
    }
    if (strlen($userBio) > 255) {
      return $this->json($response, ['status' => 'error', 'message' => 'Bio must be 255 characters or less'], 400);
    }
    if (strlen($displayName) > 64) {
      return $this->json($response, ['status' => 'error', 'message' => 'Display name must be 64 characters or less'], 400);
    }
    if (strlen($pronouns) > 32) {
      return $this->json($response, ['status' => 'error', 'message' => 'Pronouns must be 32 characters or less'], 400);
    }
    if (strlen($customStatus) > 128) {
      return $this->json($response, ['status' => 'error', 'message' => 'Custom status must be 128 characters or less'], 400);
    }
    if ($userPic !== '' && !filter_var($userPic, FILTER_VALIDATE_URL)) {
      return $this->json($response, ['status' => 'error', 'message' => 'Avatar must be a valid URL'], 400);
    }
    if (strlen($userPic) > 512) {
      return $this->json($response, ['status' => 'error', 'message' => 'Avatar URL is too long'], 400);
    }
    if ($bannerUrl !== '' && !filter_var($bannerUrl, FILTER_VALIDATE_URL)) {
      return $this->json($response, ['status' => 'error', 'message' => 'Banner must be a valid URL'], 400);
    }
    if (strlen($bannerUrl) > 512) {
      return $this->json($response, ['status' => 'error', 'message' => 'Banner URL is too long'], 400);
    }
    if (!in_array($profileCard, $allowedCards, true)) {
      return $this->json($response, ['status' => 'error', 'message' => 'Invalid profile card'], 400);
    }
    if (!in_array($avatarEffect, $allowedEffects, true)) {
      return $this->json($response, ['status' => 'error', 'message' => 'Invalid avatar effect'], 400);
    }
    if (!in_array($presenceStatus, $allowedPresence, true)) {
      return $this->json($response, ['status' => 'error', 'message' => 'Invalid presence status'], 400);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensureProfileExtraColumns($pdo);

    $dup = $pdo->prepare('SELECT COUNT(*) FROM users WHERE user_name = ? AND user_id <> ?');
    $dup->execute([$username, $userId]);
    if ((int) $dup->fetchColumn() > 0) {
      return $this->json($response, ['status' => 'error', 'message' => 'Username already taken'], 409);
    }

    $stmt = $pdo->prepare(
      'UPDATE users SET
         user_name = ?,
         user_bio = ?,
         user_pic = ?,
         display_name = ?,
         pronouns = ?,
         custom_status = ?,
         banner_url = ?,
         presence_status = ?,
         profile_card = ?,
         avatar_effect = ?
       WHERE user_id = ?'
    );
    $stmt->execute([
      $username,
      $userBio !== '' ? $userBio : null,
      $userPic !== '' ? $userPic : null,
      $displayName !== '' ? $displayName : null,
      $pronouns !== '' ? $pronouns : null,
      $customStatus !== '' ? $customStatus : null,
      $bannerUrl !== '' ? $bannerUrl : null,
      $presenceStatus,
      $profileCard,
      $avatarEffect,
      $userId,
    ]);

    $user = AuthService::loadUser($pdo, $userId);
    if (!$user) {
      return $this->json($response, ['status' => 'error', 'message' => 'Failed to load updated profile'], 500);
    }
    return $this->json($response, [
      'status' => 'success',
      'message' => 'Profile updated',
      'user' => AuthService::userToArray($user),
    ]);
  }

  public function publishPublicKey(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $body = $request->getParsedBody() ?? [];
    $publicKey = trim((string) ($body['publicKey'] ?? ''));
    if ($publicKey === '' || strlen($publicKey) < 80 || strlen($publicKey) > 2048) {
      return $this->json($response, ['status' => 'error', 'message' => 'Invalid public key'], 400);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensureCryptoAndDmColumns($pdo);
    $pdo->prepare('UPDATE users SET public_key = ? WHERE user_id = ?')->execute([$publicKey, $userId]);

    $user = AuthService::loadUser($pdo, $userId);
    return $this->json($response, [
      'status' => 'success',
      'user' => $user ? AuthService::userToArray($user) : null,
    ]);
  }

  public function updateDmPrivacy(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $body = $request->getParsedBody() ?? [];
    $policy = trim((string) ($body['dmPolicy'] ?? 'allowlist'));
    $allowed = ['everyone', 'mutual_server', 'allowlist', 'nobody'];
    if (!in_array($policy, $allowed, true)) {
      return $this->json($response, ['status' => 'error', 'message' => 'Invalid DM policy'], 400);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensureCryptoAndDmColumns($pdo);
    $pdo->prepare('UPDATE users SET dm_policy = ? WHERE user_id = ?')->execute([$policy, $userId]);

    $user = AuthService::loadUser($pdo, $userId);
    return $this->json($response, [
      'status' => 'success',
      'message' => 'DM privacy updated',
      'user' => $user ? AuthService::userToArray($user) : null,
    ]);
  }

  public function listDmAllowlist(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensureDmAllowlistTable($pdo);
    $stmt = $pdo->prepare(
      'SELECT a.allowed_user_id, u.user_name, u.user_pic
       FROM dm_allowlist a
       INNER JOIN users u ON u.user_id = a.allowed_user_id
       WHERE a.user_id = ?
       ORDER BY u.user_name ASC'
    );
    $stmt->execute([$userId]);
    $rows = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $rows[] = [
        'id' => (int) $row['allowed_user_id'],
        'username' => $row['user_name'],
        'userPic' => $row['user_pic'] ?? '',
      ];
    }
    return $this->json($response, ['status' => 'success', 'allowlist' => $rows]);
  }

  public function addDmAllowlist(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $body = $request->getParsedBody() ?? [];
    $targetUserId = isset($body['userId']) ? (int) $body['userId'] : 0;
    $username = trim((string) ($body['username'] ?? ''));
    $pdo = $this->dbService->getConnection();
    $this->ensureDmAllowlistTable($pdo);

    if ($targetUserId <= 0 && $username !== '') {
      $lookup = $pdo->prepare('SELECT user_id FROM users WHERE user_name = ? LIMIT 1');
      $lookup->execute([$username]);
      $targetUserId = (int) $lookup->fetchColumn();
    }
    if ($targetUserId <= 0 || $targetUserId === $userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Valid user required'], 400);
    }

    $pdo->prepare(
      'INSERT IGNORE INTO dm_allowlist (user_id, allowed_user_id) VALUES (?, ?)'
    )->execute([$userId, $targetUserId]);

    return $this->json($response, ['status' => 'success']);
  }

  public function removeDmAllowlist(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $targetUserId = (int) $args['targetUserId'];
    $pdo = $this->dbService->getConnection();
    $this->ensureDmAllowlistTable($pdo);
    $pdo->prepare('DELETE FROM dm_allowlist WHERE user_id = ? AND allowed_user_id = ?')
      ->execute([$userId, $targetUserId]);

    return $this->json($response, ['status' => 'success']);
  }

  public function getKeyVault(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensureKeyVaultTable($pdo);
    $stmt = $pdo->prepare(
      'SELECT vault_blob, updated_at FROM user_key_vaults WHERE user_id = ? LIMIT 1'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $this->json($response, [
      'status' => 'success',
      'vaultBlob' => $row['vault_blob'] ?? null,
      'updatedAt' => $row['updated_at'] ?? null,
    ]);
  }

  public function putKeyVault(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $body = $request->getParsedBody() ?? [];
    $vaultBlob = trim((string) ($body['vaultBlob'] ?? ''));
    $validPrefix = str_starts_with($vaultBlob, 'NIMBUSVAULT1:') || str_starts_with($vaultBlob, 'ANGVAULT1:');
    if ($vaultBlob === '' || !$validPrefix) {
      return $this->json($response, ['status' => 'error', 'message' => 'Invalid vault blob'], 400);
    }
    if (strlen($vaultBlob) > 2_000_000) {
      return $this->json($response, ['status' => 'error', 'message' => 'Vault backup too large'], 400);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensureKeyVaultTable($pdo);
    $updatedAt = gmdate('Y-m-d H:i:s');
    $pdo->prepare(
      'INSERT INTO user_key_vaults (user_id, vault_blob, updated_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE vault_blob = VALUES(vault_blob), updated_at = VALUES(updated_at)'
    )->execute([$userId, $vaultBlob, $updatedAt]);

    return $this->json($response, [
      'status' => 'success',
      'message' => 'Encrypted vault backup stored. Server cannot read its contents.',
      'updatedAt' => $updatedAt,
    ]);
  }

  public function deleteKeyVault(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $pdo = $this->dbService->getConnection();
    $this->ensureKeyVaultTable($pdo);
    $pdo->prepare('DELETE FROM user_key_vaults WHERE user_id = ?')->execute([$userId]);

    return $this->json($response, ['status' => 'success', 'message' => 'Vault backup deleted']);
  }

  public function search(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['status' => 'error', 'message' => 'Not authenticated'], 401);
    }

    $queryParams = $request->getQueryParams();
    $q = trim((string) ($queryParams['q'] ?? ''));
    if (strlen($q) < 1) {
      return $this->json($response, []);
    }

    $pdo = $this->dbService->getConnection();
    // Privacy-first: never search or return email addresses.
    $stmt = $pdo->prepare(
      "SELECT user_id, user_name, user_pic, user_bio
       FROM users
       WHERE user_id <> ?
         AND user_name LIKE ?
       ORDER BY user_name ASC
       LIMIT 20"
    );
    $like = '%' . $q . '%';
    $stmt->execute([$userId, $like]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $users = array_map(static function ($row) {
      return [
        'id' => (int) $row['user_id'],
        'username' => $row['user_name'],
        'userPic' => $row['user_pic'] ?? '',
        'userBio' => $row['user_bio'] ?? '',
      ];
    }, $rows);

    return $this->json($response, $users);
  }

  private function ensurePasswordResetTable(PDO $pdo): void
  {
    $pdo->exec(
      'CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT(64) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_prt_token_hash (token_hash),
        KEY idx_prt_user_id (user_id)
      )'
    );
  }

  private function ensureProfileExtraColumns(PDO $pdo): void
  {
    $columns = [
      'display_name' => 'VARCHAR(64) NULL',
      'pronouns' => 'VARCHAR(32) NULL',
      'custom_status' => 'VARCHAR(128) NULL',
      'banner_url' => 'VARCHAR(512) NULL',
      'presence_status' => "VARCHAR(16) NOT NULL DEFAULT 'online'",
    ];

    foreach ($columns as $name => $definition) {
      $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
      );
      $stmt->execute(['users', $name]);
      if ((int) $stmt->fetchColumn() === 0) {
        $pdo->exec('ALTER TABLE users ADD COLUMN `' . $name . '` ' . $definition);
      }
    }
    $this->ensureCryptoAndDmColumns($pdo);
  }

  private function ensureCryptoAndDmColumns(PDO $pdo): void
  {
    foreach ([
      'public_key' => 'TEXT NULL',
      'dm_policy' => "VARCHAR(32) NOT NULL DEFAULT 'allowlist'",
    ] as $name => $definition) {
      $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
      );
      $stmt->execute(['users', $name]);
      if ((int) $stmt->fetchColumn() === 0) {
        $pdo->exec('ALTER TABLE users ADD COLUMN `' . $name . '` ' . $definition);
      }
    }
  }

  private function ensureDmAllowlistTable(PDO $pdo): void
  {
    $pdo->exec(
      'CREATE TABLE IF NOT EXISTS dm_allowlist (
        user_id BIGINT(64) NOT NULL,
        allowed_user_id BIGINT(64) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, allowed_user_id)
      )'
    );
  }

  private function ensureKeyVaultTable(PDO $pdo): void
  {
    $pdo->exec(
      'CREATE TABLE IF NOT EXISTS user_key_vaults (
        user_id BIGINT(64) PRIMARY KEY,
        vault_blob MEDIUMTEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )'
    );
  }

  private function json(Response $response, array $payload, int $status = 200): Response
  {
    $response->getBody()->write(json_encode($payload));
    return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
  }
}
