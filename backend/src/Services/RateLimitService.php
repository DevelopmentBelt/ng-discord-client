<?php

namespace App\Services;

use PDO;

/**
 * Simple DB-backed rate limiter.
 *
 * Usage:
 *   $rl = new RateLimitService($pdo);
 *   if ($msg = $rl->check('login', $clientIp)) {
 *     return error response with $msg;
 *   }
 */
class RateLimitService
{
  private const LIMITS = [
    'login'           => ['max' => 10, 'window' => 300,  'lockout' => 900],   // 10 tries / 5 min → 15 min lockout
    'register'        => ['max' => 5,  'window' => 300,  'lockout' => 3600],  // 5 / 5 min → 1 hr lockout
    'forgot-password' => ['max' => 5,  'window' => 900,  'lockout' => 3600],  // 5 / 15 min → 1 hr lockout
    'reset-password'  => ['max' => 5,  'window' => 300,  'lockout' => 3600],  // 5 / 5 min → 1 hr lockout
  ];

  private PDO $pdo;
  private static bool $tableEnsured = false;

  public function __construct(PDO $pdo)
  {
    $this->pdo = $pdo;
    $this->ensureTable();
  }

  /**
   * Check and increment the counter for the given action + identifier (e.g. client IP).
   *
   * Returns null when the request is allowed, or a user-safe error string when blocked.
   */
  public function check(string $action, string $identifier): ?string
  {
    $cfg = self::LIMITS[$action] ?? ['max' => 20, 'window' => 60, 'lockout' => 300];
    $now = time();

    // Prune rows older than 48 h (best-effort; ignore errors)
    try {
      $this->pdo->prepare(
        "DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 48 HOUR)"
      )->execute();
    } catch (\Throwable) {}

    $stmt = $this->pdo->prepare(
      'SELECT attempts, window_start, locked_until FROM rate_limits WHERE action = ? AND identifier = ? LIMIT 1'
    );
    $stmt->execute([$action, $identifier]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
      // Still locked out?
      if ($row['locked_until'] && strtotime((string) $row['locked_until']) > $now) {
        $remaining = strtotime((string) $row['locked_until']) - $now;
        return 'Too many attempts. Please try again in ' . (int) ceil($remaining / 60) . ' minute(s).';
      }

      $windowStart = strtotime((string) $row['window_start']);

      if (($now - $windowStart) < $cfg['window']) {
        // Inside the active window
        if ((int) $row['attempts'] >= $cfg['max']) {
          // Lock out
          $lockedUntil = gmdate('Y-m-d H:i:s', $now + $cfg['lockout']);
          $this->pdo->prepare(
            'UPDATE rate_limits SET locked_until = ? WHERE action = ? AND identifier = ?'
          )->execute([$lockedUntil, $action, $identifier]);
          $remaining = $cfg['lockout'];
          return 'Too many attempts. Please try again in ' . (int) ceil($remaining / 60) . ' minute(s).';
        }
        // Increment within the window
        $this->pdo->prepare(
          'UPDATE rate_limits SET attempts = attempts + 1 WHERE action = ? AND identifier = ?'
        )->execute([$action, $identifier]);
      } else {
        // Window expired — start a fresh one
        $this->pdo->prepare(
          'UPDATE rate_limits SET attempts = 1, window_start = NOW(), locked_until = NULL WHERE action = ? AND identifier = ?'
        )->execute([$action, $identifier]);
      }
    } else {
      // First request from this identifier
      $this->pdo->prepare(
        'INSERT INTO rate_limits (action, identifier, attempts, window_start) VALUES (?, ?, 1, NOW())'
      )->execute([$action, $identifier]);
    }

    return null; // allowed
  }

  private function ensureTable(): void
  {
    if (self::$tableEnsured) {
      return;
    }
    self::$tableEnsured = true;

    $this->pdo->exec(
      'CREATE TABLE IF NOT EXISTS rate_limits (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(64) NOT NULL,
        identifier VARCHAR(128) NOT NULL,
        attempts INT NOT NULL DEFAULT 1,
        window_start DATETIME NOT NULL,
        locked_until DATETIME NULL,
        UNIQUE KEY uniq_rl (action, identifier),
        KEY idx_rl_window (window_start)
      )'
    );
  }
}
