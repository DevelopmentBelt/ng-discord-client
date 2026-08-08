<?php

namespace App\Controllers;

use App\Services\AuthService;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class MessageController extends Routes {
  protected function registerRoutes() {
    $this->app->get('/api/messages/{serverId}/{channelId}', [$this, 'getMessages']);
    $this->app->post('/api/messages/{channelId}', [$this, 'postMessage']);
    $this->app->delete('/api/messages', [$this, 'deleteMessage']);
  }

  public function getMessages(Request $request, Response $response, $args) {
    $userId = AuthService::getUserId();
    if (!$userId) {
      $response->getBody()->write(json_encode(['error' => 'Not authenticated']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    $serverId = (int) $args['serverId'];
    $channelId = $args['channelId'];
    $conn = $this->dbService->getConnection();
    $this->ensurePhantomColumns($conn);

    if (!$this->userIsServerMember($conn, $serverId, (int) $userId)) {
      $response->getBody()->write(json_encode(['error' => 'Not a member of this server']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    $stmt = $conn->prepare(
      "SELECT m.*, u.user_name, u.user_pic
       FROM messages m
       LEFT JOIN users u ON m.posted_by_user_id = u.user_id
       JOIN channels ch ON m.channel_id = ch.channel_id
       JOIN categories cat ON ch.category_id = cat.category_id
       WHERE m.channel_id = ? AND cat.server_id = ?
       ORDER BY m.timestamp_posted
       LIMIT 100"
    );
    $success = $stmt->execute([$channelId, $serverId]);
    if ($success) {
      $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
      $msgs = [];
      foreach ($messages as $message) {
        $msgs[] = $this->utils->toMessageModel($this->dbService, $message);
      }
      $response->getBody()->write(json_encode($msgs, JSON_PRETTY_PRINT));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }
    return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
  }

  public function postMessage(Request $request, Response $response, $args): Response {
    $authorId = AuthService::getUserId();
    if (!$authorId) {
      $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Not authenticated']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    $body = $request->getParsedBody() ?? [];
    $rawText = (string) ($body['message'] ?? '');
    $timestampPosted = $body['timestamp'] ?? null;
    $channelId = (int) $args['channelId'];
    $forceAnonymous = !empty($body['anonymous']);
    $forceEncrypted = !empty($body['encrypted']);

    if (trim($rawText) === '') {
      $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Message cannot be empty']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
      $timestampPosted = (new \DateTimeImmutable($timestampPosted ?: 'now'))
        ->setTimezone(new \DateTimeZone('UTC'))
        ->format('Y-m-d H:i:s');
    } catch (\Exception $e) {
      $timestampPosted = gmdate('Y-m-d H:i:s');
    }

    $conn = $this->dbService->getConnection();
    $this->ensurePhantomColumns($conn);

    $channelStmt = $conn->prepare(
      'SELECT ch.is_phantom, cat.server_id
       FROM channels ch
       JOIN categories cat ON cat.category_id = ch.category_id
       WHERE ch.channel_id = ?
       LIMIT 1'
    );
    $channelStmt->execute([$channelId]);
    $channel = $channelStmt->fetch(PDO::FETCH_ASSOC);
    if (!$channel) {
      $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Channel not found']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    if (!$this->userIsServerMember($conn, (int) $channel['server_id'], (int) $authorId)) {
      $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Not a member of this server']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    $isPhantom = !empty($channel['is_phantom']);
    $isAnonymous = $isPhantom || $forceAnonymous;
    $isEncrypted = $isPhantom || $forceEncrypted || str_starts_with($rawText, 'PHANTOM1:');

    if ($isPhantom && !str_starts_with($rawText, 'PHANTOM1:')) {
      $response->getBody()->write(json_encode([
        'status' => 'error',
        'message' => 'Phantom channels only accept encrypted anonymous messages',
      ]));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    // Phantom: authenticate to post, but never persist who wrote it.
    $storedAuthorId = $isAnonymous ? null : $authorId;

    $conn->beginTransaction();
    $stmt = $conn->prepare(
      'INSERT INTO messages (channel_id, posted_by_user_id, raw_text, is_anonymous, is_encrypted, timestamp_posted)
       VALUES (?, ?, ?, ?, ?, ?)'
    );
    $success = $stmt->execute([
      $channelId,
      $storedAuthorId,
      $rawText,
      $isAnonymous ? 1 : 0,
      $isEncrypted ? 1 : 0,
      $timestampPosted,
    ]);

    if ($success) {
      $messageId = (int) $conn->lastInsertId();
      $conn->commit();
      $payload = [
        'status' => 'success',
        'message' => [
          'id' => $messageId,
          'text' => $rawText,
          'rawText' => $rawText,
          'postedTimestamp' => $timestampPosted,
          'channelId' => $channelId,
          'isAnonymous' => $isAnonymous,
          'isEncrypted' => $isEncrypted,
          'author' => $isAnonymous
            ? ['userId' => 0, 'username' => 'Anonymous', 'profilePic' => '']
            : null,
        ],
      ];
      $response->getBody()->write(json_encode($payload));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    $conn->rollback();
    $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Failed to send message']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
  }

  public function deleteMessage(Request $request, Response $response, $args): Response {
    return $response;
  }

  private function ensurePhantomColumns(PDO $pdo): void
  {
    $this->ensureColumn($pdo, 'channels', 'is_phantom', 'TINYINT(1) NOT NULL DEFAULT 0');
    $this->ensureColumn($pdo, 'channels', 'phantom_key', 'VARCHAR(128) NULL');
    $this->ensureColumn($pdo, 'messages', 'is_anonymous', 'TINYINT(1) NOT NULL DEFAULT 0');
    $this->ensureColumn($pdo, 'messages', 'is_encrypted', 'TINYINT(1) NOT NULL DEFAULT 0');

    // Allow anonymous phantom posts without an author id
    try {
      $pdo->exec('ALTER TABLE messages MODIFY COLUMN posted_by_user_id BIGINT(64) NULL');
    } catch (\Throwable $e) {
      // already nullable or insufficient privileges
    }
    try {
      $pdo->exec('ALTER TABLE messages MODIFY COLUMN raw_text TEXT NOT NULL');
    } catch (\Throwable $e) {
      // ignore
    }
  }

  private function userIsServerMember(PDO $pdo, int $serverId, int $userId): bool
  {
    $ownerStmt = $pdo->prepare('SELECT owner_id FROM servers WHERE server_id = ? LIMIT 1');
    $ownerStmt->execute([$serverId]);
    $ownerId = (int) $ownerStmt->fetchColumn();
    if ($ownerId > 0 && $ownerId === $userId) {
      return true;
    }

    $stmt = $pdo->prepare('SELECT COUNT(*) FROM members WHERE server_id = ? AND user_id = ?');
    $stmt->execute([$serverId, $userId]);
    return (int) $stmt->fetchColumn() > 0;
  }

  private function ensureColumn(PDO $pdo, string $table, string $column, string $definition): void
  {
    $stmt = $pdo->prepare(
      'SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $column]);
    if ((int) $stmt->fetchColumn() === 0) {
      $pdo->exec('ALTER TABLE `' . $table . '` ADD COLUMN `' . $column . '` ' . $definition);
    }
  }
}
