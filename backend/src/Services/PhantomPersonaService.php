<?php

namespace App\Services;

use PDO;

/**
 * Stable, channel-scoped display names for Phantom posters.
 * Real usernames are never returned to clients.
 */
class PhantomPersonaService
{
  private const ADJECTIVES = [
    'Amber', 'Silent', 'Neon', 'Crimson', 'Misty', 'Velvet', 'Iron', 'Lucid',
    'Shadow', 'Solar', 'Arctic', 'Ember', 'Quiet', 'Vivid', 'Hollow', 'Bright',
    'Cobalt', 'Faded', 'Rapid', 'Obsidian', 'Silver', 'Wild', 'Hidden', 'Cosmic',
  ];

  private const NOUNS = [
    'Fox', 'Orchid', 'Comet', 'Raven', 'Lotus', 'Sparrow', 'Cipher', 'Drift',
    'Harbor', 'Mirror', 'Pebble', 'Quill', 'Ridge', 'Sable', 'Thorn', 'Wisp',
    'Falcon', 'Glacier', 'Maple', 'Nimbus', 'Onyx', 'Pulse', 'Quartz', 'Zephyr',
  ];

  public static function ensureSchema(PDO $pdo): void
  {
    $pdo->exec(
      'CREATE TABLE IF NOT EXISTS channel_phantom_personas (
        persona_id BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
        channel_id BIGINT(64) NOT NULL,
        user_id BIGINT(64) NOT NULL,
        display_name VARCHAR(64) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_channel_user_persona (channel_id, user_id),
        UNIQUE KEY uniq_channel_display_name (channel_id, display_name),
        KEY idx_cpp_channel (channel_id)
      )'
    );

    self::ensureMessageColumns($pdo);
  }

  public static function ensureMessageColumns(PDO $pdo): void
  {
    foreach ([
      'phantom_persona_id' => 'BIGINT(64) NULL',
      'phantom_author' => 'VARCHAR(64) NULL',
    ] as $column => $definition) {
      $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
      );
      $stmt->execute(['messages', $column]);
      if ((int) $stmt->fetchColumn() === 0) {
        $pdo->exec('ALTER TABLE messages ADD COLUMN `' . $column . '` ' . $definition);
      }
    }
  }

  /**
   * @return array{personaId: int, displayName: string}
   */
  public static function getOrCreate(PDO $pdo, int $channelId, int $userId): array
  {
    self::ensureSchema($pdo);

    $stmt = $pdo->prepare(
      'SELECT persona_id, display_name FROM channel_phantom_personas
       WHERE channel_id = ? AND user_id = ? LIMIT 1'
    );
    $stmt->execute([$channelId, $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
      return [
        'personaId' => (int) $row['persona_id'],
        'displayName' => (string) $row['display_name'],
      ];
    }

    $displayName = self::generateUniqueName($pdo, $channelId);
    $insert = $pdo->prepare(
      'INSERT INTO channel_phantom_personas (channel_id, user_id, display_name)
       VALUES (?, ?, ?)'
    );

    try {
      $insert->execute([$channelId, $userId, $displayName]);
    } catch (\Throwable $e) {
      // Race: another request created the persona
      $stmt->execute([$channelId, $userId]);
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($row) {
        return [
          'personaId' => (int) $row['persona_id'],
          'displayName' => (string) $row['display_name'],
        ];
      }
      throw $e;
    }

    return [
      'personaId' => (int) $pdo->lastInsertId(),
      'displayName' => $displayName,
    ];
  }

  private static function generateUniqueName(PDO $pdo, int $channelId): string
  {
    $check = $pdo->prepare(
      'SELECT COUNT(*) FROM channel_phantom_personas WHERE channel_id = ? AND display_name = ?'
    );

    for ($i = 0; $i < 40; $i++) {
      $name = self::ADJECTIVES[random_int(0, count(self::ADJECTIVES) - 1)]
        . ' '
        . self::NOUNS[random_int(0, count(self::NOUNS) - 1)];
      $check->execute([$channelId, $name]);
      if ((int) $check->fetchColumn() === 0) {
        return $name;
      }
    }

    return 'Phantom ' . strtoupper(bin2hex(random_bytes(3)));
  }
}
