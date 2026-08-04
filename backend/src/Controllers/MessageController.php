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
    $serverId = $args['serverId'];
    $channelId = $args['channelId'];
    $conn = $this->dbService->getConnection();
    $stmt = $conn->prepare(
      "SELECT m.*, u.user_name, u.user_pic
       FROM messages m
       JOIN users u ON m.posted_by_user_id = u.user_id
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
    } else {
      return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
  }

  public function postMessage(Request $request, Response $response, $args): Response {
    $authorId = AuthService::getUserId();
    if (!$authorId) {
      $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Not authenticated']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    $body = $request->getParsedBody() ?? [];
    $rawText = $body['message'] ?? '';
    $attachments = $body['attachments'] ?? [];
    // TODO We need to parse the mentioned members from the rawText
    $timestampPosted = $body['timestamp'] ?? null;
    $channelId = $args['channelId'];

    if (trim((string) $rawText) === '') {
      $response->getBody()->write(json_encode(['status' => 'error', 'message' => 'Message cannot be empty']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    // MySQL DATETIME rejects ISO-8601 with T/Z; normalize to Y-m-d H:i:s
    try {
      $timestampPosted = (new \DateTimeImmutable($timestampPosted ?: 'now'))
        ->setTimezone(new \DateTimeZone('UTC'))
        ->format('Y-m-d H:i:s');
    } catch (\Exception $e) {
      $timestampPosted = gmdate('Y-m-d H:i:s');
    }

    $conn = $this->dbService->getConnection();
    $conn->beginTransaction();
    $stmt = $conn->prepare("INSERT INTO `messages` (channel_id, posted_by_user_id, raw_text, timestamp_posted) VALUES (?, ?, ?, ?)");
    $success = $stmt->execute([$channelId, $authorId, $rawText, $timestampPosted]);
    // TODO We need to handle the mentions in the message...

    if ($success) {
      $conn->commit();
      $response->getBody()->write(json_encode([]));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } else {
      $conn->rollback();
      $response->getBody()->write(json_encode([]));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
  }

  public function deleteMessage(Request $request, Response $response, $args): Response {
    // TODO We need to delete the message and attachments
    return $response;
  }
}
