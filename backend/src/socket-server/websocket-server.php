<?php

/**
 * Authenticated, per-topic WebSocket server (C3 fix).
 *
 * Protocol (all messages are JSON):
 *
 * Client → Server:
 *   { "type": "auth",      "ticket": "<64-hex ticket from POST /api/ws-ticket>" }
 *   { "type": "subscribe", "topic":  "channel:{channelId}" | "dm:{conversationId}" }
 *   { "type": "message",   "data":   <any JSON> }
 *   { "type": "ping" }
 *
 * Server → Client:
 *   { "type": "auth_ok",    "userId": <int> }
 *   { "type": "subscribed", "topic":  <string> }
 *   { "type": "message",    "topic":  <string>, "userId": <int>, "data": <any>, "ts": <int> }
 *   { "type": "pong" }
 *   { "type": "error",     "message": <string> }
 */

require __DIR__ . '/../../vendor/autoload.php';

error_reporting(E_ALL ^ E_DEPRECATED);

use Ratchet\App;
use Ratchet\ConnectionInterface;
use Ratchet\MessageComponentInterface;
use Ratchet\WebSocket\WsServer;

if (is_readable(__DIR__ . '/../../.env')) {
  $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
  $dotenv->safeLoad();
}

// ---------------------------------------------------------------------------
// Database connection helper
// ---------------------------------------------------------------------------
function makePdo(): PDO
{
  $host    = $_ENV['DB_HOST']    ?? getenv('DB_HOST')    ?: 'localhost';
  $db      = $_ENV['DB_NAME']    ?? getenv('DB_NAME')    ?: 'nimbus';
  $user    = $_ENV['DB_USER']    ?? getenv('DB_USER')    ?: 'nimbus';
  $pass    = $_ENV['DB_PASS']    ?? getenv('DB_PASS')    ?: 'nimbus';
  $charset = $_ENV['DB_CHARSET'] ?? getenv('DB_CHARSET') ?: 'utf8mb4';

  return new PDO(
    "mysql:host=$host;dbname=$db;charset=$charset",
    $user,
    $pass,
    [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ]
  );
}

// ---------------------------------------------------------------------------
// Authenticated, per-topic socket listener
// ---------------------------------------------------------------------------
class AuthenticatedSocketListener implements MessageComponentInterface
{
  /** SplObjectStorage<ConnectionInterface, array{userId:int|null, topic:string|null}> */
  private \SplObjectStorage $connections;

  /** topic => SplObjectStorage<ConnectionInterface> */
  private array $topics = [];

  private PDO $pdo;

  public function __construct(PDO $pdo)
  {
    $this->connections = new \SplObjectStorage();
    $this->pdo = $pdo;
  }

  // -------------------------------------------------------------------------
  public function onOpen(ConnectionInterface $conn): void
  {
    $this->connections->attach($conn, ['userId' => null, 'topic' => null]);
    // Client must send { type: "auth", ticket: "..." } before anything else.
  }

  // -------------------------------------------------------------------------
  public function onMessage(ConnectionInterface $from, $msg): void
  {
    $data = json_decode($msg, true);
    if (!is_array($data) || !isset($data['type'])) {
      $from->send(json_encode(['type' => 'error', 'message' => 'Invalid message format']));
      $from->close();
      return;
    }

    $info = $this->connections->offsetGet($from);

    switch ($data['type']) {
      case 'auth':
        $this->handleAuth($from, $data, $info);
        return;

      case 'ping':
        $from->send(json_encode(['type' => 'pong']));
        return;

      default:
        break;
    }

    // All further message types require authentication.
    if ($info['userId'] === null) {
      $from->send(json_encode(['type' => 'error', 'message' => 'Authentication required']));
      $from->close();
      return;
    }

    switch ($data['type']) {
      case 'subscribe':
        $this->handleSubscribe($from, $data, $info);
        break;

      case 'message':
        $this->handleMessage($from, $data, $info);
        break;

      default:
        $from->send(json_encode(['type' => 'error', 'message' => 'Unknown message type']));
    }
  }

  // -------------------------------------------------------------------------
  public function onClose(ConnectionInterface $conn): void
  {
    if ($this->connections->offsetExists($conn)) {
      $info = $this->connections->offsetGet($conn);
      if ($info['topic']) {
        $this->removeFromTopic($conn, $info['topic']);
      }
      $this->connections->detach($conn);
    }
  }

  // -------------------------------------------------------------------------
  public function onError(ConnectionInterface $conn, \Exception $e): void
  {
    error_log('[WS] Error: ' . $e->getMessage());
    $conn->close();
  }

  // =========================================================================
  // Auth
  // =========================================================================
  private function handleAuth(ConnectionInterface $conn, array $data, array $info): void
  {
    if ($info['userId'] !== null) {
      $conn->send(json_encode(['type' => 'error', 'message' => 'Already authenticated']));
      return;
    }

    $ticket = trim((string) ($data['ticket'] ?? ''));
    if ($ticket === '') {
      $conn->send(json_encode(['type' => 'error', 'message' => 'Ticket required']));
      $conn->close();
      return;
    }

    try {
      $stmt = $this->pdo->prepare(
        'SELECT user_id FROM ws_tickets
         WHERE ticket = ? AND used_at IS NULL AND expires_at > NOW()
         LIMIT 1'
      );
      $stmt->execute([$ticket]);
      $row = $stmt->fetch();

      if (!$row) {
        $conn->send(json_encode(['type' => 'error', 'message' => 'Invalid or expired ticket']));
        $conn->close();
        return;
      }

      $userId = (int) $row['user_id'];

      // Invalidate the ticket immediately (single-use)
      $this->pdo->prepare('UPDATE ws_tickets SET used_at = NOW() WHERE ticket = ?')
        ->execute([$ticket]);

      $info['userId'] = $userId;
      $this->connections->offsetSet($conn, $info);

      $conn->send(json_encode(['type' => 'auth_ok', 'userId' => $userId]));
    } catch (\Throwable $e) {
      error_log('[WS] Auth error: ' . $e->getMessage());
      $conn->send(json_encode(['type' => 'error', 'message' => 'Authentication failed']));
      $conn->close();
    }
  }

  // =========================================================================
  // Subscribe
  // =========================================================================
  private function handleSubscribe(ConnectionInterface $conn, array $data, array $info): void
  {
    $topic  = trim((string) ($data['topic'] ?? ''));
    $userId = (int) $info['userId'];

    if ($topic === '') {
      $conn->send(json_encode(['type' => 'error', 'message' => 'Topic required']));
      return;
    }

    if (!$this->validateTopic($topic, $userId)) {
      $conn->send(json_encode(['type' => 'error', 'message' => 'Not authorised for this topic']));
      return;
    }

    // Unsubscribe from old topic
    if ($info['topic']) {
      $this->removeFromTopic($conn, $info['topic']);
    }

    // Add to new topic
    if (!isset($this->topics[$topic])) {
      $this->topics[$topic] = new \SplObjectStorage();
    }
    $this->topics[$topic]->attach($conn);

    $info['topic'] = $topic;
    $this->connections->offsetSet($conn, $info);

    $conn->send(json_encode(['type' => 'subscribed', 'topic' => $topic]));
  }

  // =========================================================================
  // Message (relay to topic members)
  // =========================================================================
  private function handleMessage(ConnectionInterface $from, array $data, array $info): void
  {
    $topic = $info['topic'];
    if (!$topic || !isset($this->topics[$topic])) {
      $from->send(json_encode(['type' => 'error', 'message' => 'Subscribe to a topic first']));
      return;
    }

    $payload = json_encode([
      'type'   => 'message',
      'topic'  => $topic,
      'userId' => (int) $info['userId'],
      'data'   => $data['data'] ?? null,
      'ts'     => time(),
    ]);

    foreach ($this->topics[$topic] as $client) {
      $client->send($payload);
    }
  }

  // =========================================================================
  // Topic authorisation
  // =========================================================================
  private function validateTopic(string $topic, int $userId): bool
  {
    try {
      if (str_starts_with($topic, 'channel:')) {
        $channelId = (int) substr($topic, strlen('channel:'));
        if ($channelId <= 0) {
          return false;
        }
        // Look up the server this channel belongs to, then check membership.
        $stmt = $this->pdo->prepare(
          'SELECT cat.server_id FROM channels ch
           JOIN categories cat ON cat.category_id = ch.category_id
           WHERE ch.channel_id = ? LIMIT 1'
        );
        $stmt->execute([$channelId]);
        $row = $stmt->fetch();
        if (!$row) {
          return false;
        }
        $serverId = (int) $row['server_id'];

        // Check owner
        $ownerStmt = $this->pdo->prepare('SELECT owner_id FROM servers WHERE server_id = ? LIMIT 1');
        $ownerStmt->execute([$serverId]);
        $ownerRow = $ownerStmt->fetch();
        if ($ownerRow && (int) $ownerRow['owner_id'] === $userId) {
          return true;
        }

        // Check member
        $memberStmt = $this->pdo->prepare(
          'SELECT COUNT(*) AS cnt FROM members WHERE server_id = ? AND user_id = ?'
        );
        $memberStmt->execute([$serverId, $userId]);
        return (int) $memberStmt->fetchColumn() > 0;
      }

      if (str_starts_with($topic, 'dm:')) {
        $conversationId = (int) substr($topic, strlen('dm:'));
        if ($conversationId <= 0) {
          return false;
        }
        $stmt = $this->pdo->prepare(
          'SELECT COUNT(*) AS cnt FROM dm_participants WHERE conversation_id = ? AND user_id = ?'
        );
        $stmt->execute([$conversationId, $userId]);
        return (int) $stmt->fetchColumn() > 0;
      }
    } catch (\Throwable $e) {
      error_log('[WS] Topic validation error: ' . $e->getMessage());
    }

    return false;
  }

  // =========================================================================
  // Helpers
  // =========================================================================
  private function removeFromTopic(ConnectionInterface $conn, string $topic): void
  {
    if (isset($this->topics[$topic])) {
      $this->topics[$topic]->detach($conn);
      if ($this->topics[$topic]->count() === 0) {
        unset($this->topics[$topic]);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
try {
  $pdo = makePdo();
} catch (\Throwable $e) {
  echo "[WS] DB connection failed: " . $e->getMessage() . "\n";
  exit(1);
}

$httpHost    = getenv('WS_HTTP_HOST') ?: 'localhost';
$port        = (int) (getenv('WS_PORT')  ?: 8080);
$bindAddress = getenv('WS_HOST')         ?: '0.0.0.0';

$listener = new AuthenticatedSocketListener($pdo);
$wsServer = new WsServer($listener);

$app = new App($httpHost, $port, $bindAddress);
// Single unified endpoint; origin check uses configured WS_HTTP_HOST
$app->route('/ws', $wsServer, ['*']);

// Backward-compat aliases so existing clients can migrate gradually
$app->route('/channel', $wsServer, ['*']);
$app->route('/dm',      $wsServer, ['*']);

echo "[WS] Listening on {$bindAddress}:{$port}\n";
$app->run();
