<?php

namespace App\Controllers;

use App\Services\AuthService;
use Exception;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class DirectMessageController extends Routes
{
  protected function registerRoutes(): void
  {
    $this->app->get('/api/dms', [$this, 'listConversations']);
    $this->app->post('/api/dms', [$this, 'startConversation']);
    $this->app->get('/api/dms/{conversationId}/messages', [$this, 'getMessages']);
    $this->app->post('/api/dms/{conversationId}/messages', [$this, 'postMessage']);
  }

  public function listConversations(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['error' => 'Not authenticated'], 401);
    }

    try {
      $pdo = $this->dbService->getConnection();
      $stmt = $pdo->prepare(
        "SELECT c.conversation_id, c.updated_at,
                u.user_id AS other_user_id, u.user_name AS other_username, u.user_pic AS other_user_pic,
                lm.message_id AS last_message_id, lm.raw_text AS last_message_text,
                lm.timestamp_posted AS last_message_at, lm.posted_by_user_id AS last_message_author_id
         FROM dm_conversations c
         INNER JOIN dm_participants me ON me.conversation_id = c.conversation_id AND me.user_id = ?
         INNER JOIN dm_participants other ON other.conversation_id = c.conversation_id AND other.user_id <> ?
         INNER JOIN users u ON u.user_id = other.user_id
         LEFT JOIN dm_messages lm ON lm.message_id = (
           SELECT m.message_id
           FROM dm_messages m
           WHERE m.conversation_id = c.conversation_id
           ORDER BY m.timestamp_posted DESC, m.message_id DESC
           LIMIT 1
         )
         WHERE c.is_group = 0
         ORDER BY COALESCE(lm.timestamp_posted, c.updated_at, c.created_at) DESC"
      );
      $stmt->execute([$userId, $userId]);
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

      $conversations = array_map(function ($row) {
        return [
          'id' => (string) $row['conversation_id'],
          'participant' => [
            'id' => (int) $row['other_user_id'],
            'username' => $row['other_username'],
            'userPic' => $row['other_user_pic'] ?? '',
            'email' => '',
            'userBio' => '',
          ],
          'lastMessage' => $row['last_message_id'] ? [
            'id' => (string) $row['last_message_id'],
            'rawText' => $row['last_message_text'],
            'text' => $row['last_message_text'],
            'postedTimestamp' => $row['last_message_at'],
            'author' => [
              'userId' => (int) $row['last_message_author_id'],
            ],
          ] : null,
          'updatedAt' => $row['updated_at'] ?? $row['last_message_at'],
        ];
      }, $rows);

      return $this->json($response, $conversations);
    } catch (Exception $e) {
      error_log('listConversations: ' . $e->getMessage());
      return $this->json($response, ['error' => 'Failed to load conversations'], 500);
    }
  }

  public function startConversation(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['error' => 'Not authenticated'], 401);
    }

    $body = $request->getParsedBody() ?? [];
    $targetUserId = isset($body['userId']) ? (int) $body['userId'] : 0;
    $username = trim((string) ($body['username'] ?? ''));

    try {
      $pdo = $this->dbService->getConnection();

      if ($targetUserId <= 0 && $username !== '') {
        $lookup = $pdo->prepare('SELECT user_id FROM users WHERE user_name = ? LIMIT 1');
        $lookup->execute([$username]);
        $targetUserId = (int) $lookup->fetchColumn();
      }

      if ($targetUserId <= 0) {
        return $this->json($response, ['error' => 'User not found'], 404);
      }
      if ($targetUserId === $userId) {
        return $this->json($response, ['error' => 'You cannot message yourself'], 400);
      }

      $this->ensureDmPrivacySchema($pdo);
      $userCheck = $pdo->prepare('SELECT user_id, user_name, user_pic, dm_policy FROM users WHERE user_id = ?');
      $userCheck->execute([$targetUserId]);
      $other = $userCheck->fetch(PDO::FETCH_ASSOC);
      if (!$other) {
        return $this->json($response, ['error' => 'User not found'], 404);
      }

      if (!$this->canStartDm($pdo, $userId, $targetUserId, (string) ($other['dm_policy'] ?? 'allowlist'))) {
        return $this->json($response, [
          'error' => 'This user only accepts DMs from approved contacts.',
        ], 403);
      }

      $existing = $pdo->prepare(
        "SELECT c.conversation_id
         FROM dm_conversations c
         INNER JOIN dm_participants p1 ON p1.conversation_id = c.conversation_id AND p1.user_id = ?
         INNER JOIN dm_participants p2 ON p2.conversation_id = c.conversation_id AND p2.user_id = ?
         WHERE c.is_group = 0
         LIMIT 1"
      );
      $existing->execute([$userId, $targetUserId]);
      $conversationId = $existing->fetchColumn();

      if (!$conversationId) {
        $pdo->beginTransaction();
        $pdo->prepare('INSERT INTO dm_conversations (is_group) VALUES (0)')->execute();
        $conversationId = (int) $pdo->lastInsertId();
        $insertParticipant = $pdo->prepare(
          'INSERT INTO dm_participants (conversation_id, user_id, joined_at) VALUES (?, ?, NOW())'
        );
        $insertParticipant->execute([$conversationId, $userId]);
        $insertParticipant->execute([$conversationId, $targetUserId]);
        $pdo->commit();
      }

      return $this->json($response, [
        'id' => (string) $conversationId,
        'participant' => [
          'id' => (int) $other['user_id'],
          'username' => $other['user_name'],
          'userPic' => $other['user_pic'] ?? '',
          'email' => '',
          'userBio' => '',
        ],
        'lastMessage' => null,
      ], 201);
    } catch (Exception $e) {
      if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
      }
      error_log('startConversation: ' . $e->getMessage());
      return $this->json($response, ['error' => 'Failed to start conversation'], 500);
    }
  }

  public function getMessages(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['error' => 'Not authenticated'], 401);
    }

    $conversationId = (int) $args['conversationId'];
    try {
      $pdo = $this->dbService->getConnection();
      if (!$this->isParticipant($pdo, $conversationId, $userId)) {
        return $this->json($response, ['error' => 'Not a participant'], 403);
      }

      $stmt = $pdo->prepare(
        "SELECT m.message_id, m.conversation_id, m.raw_text, m.timestamp_posted,
                u.user_id, u.user_name, u.user_pic
         FROM dm_messages m
         INNER JOIN users u ON u.user_id = m.posted_by_user_id
         WHERE m.conversation_id = ?
         ORDER BY m.timestamp_posted ASC, m.message_id ASC
         LIMIT 200"
      );
      $stmt->execute([$conversationId]);
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

      $messages = array_map(fn($row) => $this->toMessage($row), $rows);
      $pdo->prepare('UPDATE dm_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?')
        ->execute([$conversationId, $userId]);

      return $this->json($response, $messages);
    } catch (Exception $e) {
      error_log('getDmMessages: ' . $e->getMessage());
      return $this->json($response, ['error' => 'Failed to load messages'], 500);
    }
  }

  public function postMessage(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['error' => 'Not authenticated'], 401);
    }

    $conversationId = (int) $args['conversationId'];
    $body = $request->getParsedBody() ?? [];
    $rawText = trim((string) ($body['message'] ?? ''));
    $timestamp = $body['timestamp'] ?? null;

    if ($rawText === '') {
      return $this->json($response, ['error' => 'Message cannot be empty'], 400);
    }

    try {
      $timestampPosted = (new \DateTimeImmutable($timestamp ?: 'now'))
        ->setTimezone(new \DateTimeZone('UTC'))
        ->format('Y-m-d H:i:s');
    } catch (\Exception $e) {
      $timestampPosted = gmdate('Y-m-d H:i:s');
    }

    try {
      $pdo = $this->dbService->getConnection();
      if (!$this->isParticipant($pdo, $conversationId, $userId)) {
        return $this->json($response, ['error' => 'Not a participant'], 403);
      }

      $stmt = $pdo->prepare(
        'INSERT INTO dm_messages (conversation_id, posted_by_user_id, raw_text, timestamp_posted)
         VALUES (?, ?, ?, ?)'
      );
      $stmt->execute([$conversationId, $userId, $rawText, $timestampPosted]);
      $messageId = (int) $pdo->lastInsertId();

      $pdo->prepare('UPDATE dm_conversations SET updated_at = NOW() WHERE conversation_id = ?')
        ->execute([$conversationId]);

      $user = AuthService::loadUser($pdo, $userId);
      $message = [
        'id' => (string) $messageId,
        'text' => $rawText,
        'rawText' => $rawText,
        'postedTimestamp' => $timestampPosted,
        'conversationId' => (string) $conversationId,
        'author' => [
          'userId' => $userId,
          'username' => $user?->getName() ?? '',
          'profilePic' => $user?->getPic() ?? '',
        ],
      ];

      return $this->json($response, $message, 201);
    } catch (Exception $e) {
      error_log('postDmMessage: ' . $e->getMessage());
      return $this->json($response, ['error' => 'Failed to send message'], 500);
    }
  }

  private function isParticipant(PDO $pdo, int $conversationId, int $userId): bool
  {
    $stmt = $pdo->prepare('SELECT 1 FROM dm_participants WHERE conversation_id = ? AND user_id = ?');
    $stmt->execute([$conversationId, $userId]);
    return (bool) $stmt->fetchColumn();
  }

  private function ensureDmPrivacySchema(PDO $pdo): void
  {
    $stmt = $pdo->prepare(
      'SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute(['users', 'dm_policy']);
    if ((int) $stmt->fetchColumn() === 0) {
      $pdo->exec("ALTER TABLE users ADD COLUMN `dm_policy` VARCHAR(32) NOT NULL DEFAULT 'allowlist'");
    }
    $pdo->exec(
      'CREATE TABLE IF NOT EXISTS dm_allowlist (
        user_id BIGINT(64) NOT NULL,
        allowed_user_id BIGINT(64) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, allowed_user_id)
      )'
    );
  }

  /**
   * Privacy-first DM gate based on the recipient's policy.
   */
  private function canStartDm(PDO $pdo, int $fromUserId, int $toUserId, string $policy): bool
  {
    $policy = $policy ?: 'allowlist';
    if ($policy === 'everyone') {
      return true;
    }
    if ($policy === 'nobody') {
      return false;
    }
    if ($policy === 'mutual_server') {
      $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM members a
         INNER JOIN members b ON a.server_id = b.server_id
         WHERE a.user_id = ? AND b.user_id = ?'
      );
      $stmt->execute([$fromUserId, $toUserId]);
      return (int) $stmt->fetchColumn() > 0;
    }

    // allowlist (default)
    $stmt = $pdo->prepare(
      'SELECT COUNT(*) FROM dm_allowlist WHERE user_id = ? AND allowed_user_id = ?'
    );
    $stmt->execute([$toUserId, $fromUserId]);
    return (int) $stmt->fetchColumn() > 0;
  }

  private function toMessage(array $row): array
  {
    return [
      'id' => (string) $row['message_id'],
      'text' => $row['raw_text'],
      'rawText' => $row['raw_text'],
      'postedTimestamp' => $row['timestamp_posted'],
      'conversationId' => (string) $row['conversation_id'],
      'author' => [
        'userId' => (int) $row['user_id'],
        'username' => $row['user_name'],
        'profilePic' => $row['user_pic'] ?? '',
      ],
    ];
  }

  private function json(Response $response, $payload, int $status = 200): Response
  {
    $response->getBody()->write(json_encode($payload));
    return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
  }
}
