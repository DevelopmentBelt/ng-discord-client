<?php

namespace App\Controllers;

use App\Services\AuthService;
use Exception;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class InboxController extends Routes
{
  protected function registerRoutes(): void
  {
    $this->app->get('/api/inbox', [$this, 'getInboxItems']);
    $this->app->put('/api/inbox/read-all', [$this, 'markAllAsRead']);
    $this->app->put('/api/inbox/{itemId}/read', [$this, 'markInboxItemAsRead']);
    $this->app->delete('/api/inbox/{itemId}', [$this, 'deleteInboxItem']);
  }

  public function getInboxItems(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['error' => 'Not authenticated'], 401);
    }

    try {
      $pdo = $this->dbService->getConnection();
      $user = AuthService::loadUser($pdo, $userId);
      $username = $user?->getName() ?? '';

      $states = $this->loadStates($pdo, $userId);
      $items = array_merge(
        $this->buildDmItems($pdo, $userId, $states),
        $this->buildMentionItems($pdo, $userId, $username, $states)
      );

      usort($items, static function ($a, $b) {
        return strtotime((string) $b['timestamp']) <=> strtotime((string) $a['timestamp']);
      });

      return $this->json($response, array_values($items));
    } catch (Exception $e) {
      error_log('getInboxItems: ' . $e->getMessage());
      return $this->json($response, ['error' => 'Failed to load inbox'], 500);
    }
  }

  public function markInboxItemAsRead(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['error' => 'Not authenticated'], 401);
    }

    $itemId = urldecode((string) $args['itemId']);
    try {
      $pdo = $this->dbService->getConnection();
      if (str_starts_with($itemId, 'dm:')) {
        $conversationId = (int) substr($itemId, 3);
        $pdo->prepare('UPDATE dm_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?')
          ->execute([$conversationId, $userId]);
      }
      $this->upsertState($pdo, $userId, $itemId, true, false);
      return $this->json($response, ['success' => true]);
    } catch (Exception $e) {
      error_log('markInboxItemAsRead: ' . $e->getMessage());
      return $this->json($response, ['error' => 'Failed to mark as read'], 500);
    }
  }

  public function markAllAsRead(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['error' => 'Not authenticated'], 401);
    }

    try {
      $pdo = $this->dbService->getConnection();
      $pdo->prepare('UPDATE dm_participants SET last_read_at = NOW() WHERE user_id = ?')
        ->execute([$userId]);

      $states = $this->loadStates($pdo, $userId);
      $user = AuthService::loadUser($pdo, $userId);
      $username = $user?->getName() ?? '';
      $items = array_merge(
        $this->buildDmItems($pdo, $userId, $states),
        $this->buildMentionItems($pdo, $userId, $username, $states)
      );
      foreach ($items as $item) {
        $this->upsertState($pdo, $userId, $item['id'], true, false);
      }

      return $this->json($response, ['success' => true]);
    } catch (Exception $e) {
      error_log('markAllAsRead: ' . $e->getMessage());
      return $this->json($response, ['error' => 'Failed to mark all as read'], 500);
    }
  }

  public function deleteInboxItem(Request $request, Response $response, $args): Response
  {
    $userId = AuthService::getUserId();
    if (!$userId) {
      return $this->json($response, ['error' => 'Not authenticated'], 401);
    }

    $itemId = urldecode((string) $args['itemId']);
    try {
      $pdo = $this->dbService->getConnection();
      $this->upsertState($pdo, $userId, $itemId, true, true);
      return $this->json($response, ['success' => true]);
    } catch (Exception $e) {
      error_log('deleteInboxItem: ' . $e->getMessage());
      return $this->json($response, ['error' => 'Failed to delete inbox item'], 500);
    }
  }

  private function buildDmItems(PDO $pdo, int $userId, array $states): array
  {
    $stmt = $pdo->prepare(
      "SELECT c.conversation_id,
              u.user_id AS other_user_id, u.user_name AS other_username, u.user_pic AS other_user_pic,
              me.last_read_at,
              lm.message_id, lm.raw_text, lm.timestamp_posted, lm.posted_by_user_id
       FROM dm_conversations c
       INNER JOIN dm_participants me ON me.conversation_id = c.conversation_id AND me.user_id = ?
       INNER JOIN dm_participants other ON other.conversation_id = c.conversation_id AND other.user_id <> ?
       INNER JOIN users u ON u.user_id = other.user_id
       INNER JOIN dm_messages lm ON lm.message_id = (
         SELECT m.message_id FROM dm_messages m
         WHERE m.conversation_id = c.conversation_id
         ORDER BY m.timestamp_posted DESC, m.message_id DESC
         LIMIT 1
       )
       WHERE c.is_group = 0
       ORDER BY lm.timestamp_posted DESC
       LIMIT 50"
    );
    $stmt->execute([$userId, $userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $items = [];
    foreach ($rows as $row) {
      $itemId = 'dm:' . $row['conversation_id'];
      $state = $states[$itemId] ?? null;
      if ($state && (int) $state['is_deleted'] === 1) {
        continue;
      }

      $isReadByState = $state ? (int) $state['is_read'] === 1 : false;
      $lastRead = $row['last_read_at'] ? strtotime($row['last_read_at']) : 0;
      $lastMessageAt = strtotime($row['timestamp_posted']);
      $fromOther = (int) $row['posted_by_user_id'] !== $userId;
      $isRead = $isReadByState || !$fromOther || ($lastRead > 0 && $lastRead >= $lastMessageAt);

      $items[] = [
        'id' => $itemId,
        'type' => 'direct_message',
        'title' => 'New message from ' . $row['other_username'],
        'content' => $row['raw_text'],
        'timestamp' => $row['timestamp_posted'],
        'isRead' => $isRead,
        'priority' => $isRead ? 'low' : 'medium',
        'conversationId' => (string) $row['conversation_id'],
        'sender' => [
          'id' => (int) $row['other_user_id'],
          'username' => $row['other_username'],
          'userPic' => $row['other_user_pic'] ?? '',
          'email' => '',
          'userBio' => '',
        ],
      ];
    }
    return $items;
  }

  private function buildMentionItems(PDO $pdo, int $userId, string $username, array $states): array
  {
    if ($username === '') {
      return [];
    }

    $stmt = $pdo->prepare(
      "SELECT m.message_id, m.raw_text, m.timestamp_posted, m.channel_id,
              u.user_id, u.user_name, u.user_pic,
              ch.channel_name, cat.server_id, s.server_name
       FROM messages m
       INNER JOIN users u ON u.user_id = m.posted_by_user_id
       INNER JOIN channels ch ON ch.channel_id = m.channel_id
       INNER JOIN categories cat ON cat.category_id = ch.category_id
       INNER JOIN servers s ON s.server_id = cat.server_id
       INNER JOIN members mem ON mem.server_id = s.server_id AND mem.user_id = ?
       WHERE m.posted_by_user_id <> ?
         AND m.raw_text LIKE ?
       ORDER BY m.timestamp_posted DESC
       LIMIT 50"
    );
    $stmt->execute([$userId, $userId, '%@' . $username . '%']);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $items = [];
    foreach ($rows as $row) {
      $itemId = 'mention:' . $row['message_id'];
      $state = $states[$itemId] ?? null;
      if ($state && (int) $state['is_deleted'] === 1) {
        continue;
      }

      $items[] = [
        'id' => $itemId,
        'type' => 'mention',
        'title' => 'You were mentioned in #' . $row['channel_name'],
        'content' => $row['raw_text'],
        'timestamp' => $row['timestamp_posted'],
        'isRead' => $state ? (int) $state['is_read'] === 1 : false,
        'priority' => 'high',
        'serverId' => (string) $row['server_id'],
        'serverName' => $row['server_name'],
        'channelId' => (int) $row['channel_id'],
        'channelName' => $row['channel_name'],
        'mentionCount' => 1,
        'sender' => [
          'id' => (int) $row['user_id'],
          'username' => $row['user_name'],
          'userPic' => $row['user_pic'] ?? '',
          'email' => '',
          'userBio' => '',
        ],
      ];
    }
    return $items;
  }

  private function loadStates(PDO $pdo, int $userId): array
  {
    $stmt = $pdo->prepare('SELECT item_key, is_read, is_deleted FROM inbox_states WHERE user_id = ?');
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $map = [];
    foreach ($rows as $row) {
      $map[$row['item_key']] = $row;
    }
    return $map;
  }

  private function upsertState(PDO $pdo, int $userId, string $itemKey, bool $isRead, bool $isDeleted): void
  {
    $stmt = $pdo->prepare(
      "INSERT INTO inbox_states (user_id, item_key, is_read, is_deleted, updated_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         is_read = VALUES(is_read),
         is_deleted = VALUES(is_deleted),
         updated_at = NOW()"
    );
    $stmt->execute([$userId, $itemKey, $isRead ? 1 : 0, $isDeleted ? 1 : 0]);
  }

  private function json(Response $response, $payload, int $status = 200): Response
  {
    // Avoid double-writing if reused awkwardly
    $fresh = $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    $fresh->getBody()->write(json_encode($payload));
    return $fresh;
  }
}
