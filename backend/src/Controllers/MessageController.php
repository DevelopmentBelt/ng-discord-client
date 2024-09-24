<?php

namespace App\Controllers;

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
    $stmt = $conn->prepare("SELECT * FROM `messages` WHERE `channel_id` = ?
                         ORDER BY `timestamp_posted` LIMIT 100");
    $success = $stmt->execute([$channelId]);
    if ($success) {
      $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
      $msgs = [];
      foreach ($messages as $message) {
        $msgs[] = $this->utils->toMessageModel($this->dbService, $message);
      }
      $response->getBody()->write(json_encode($msgs, JSON_PRETTY_PRINT));
      return $response->withStatus(200);
    } else {
      return $response->withStatus(500);
    }
  }

  public function postMessage(Request $request, Response $response, $args): Response {
    $body = $request->getParsedBody();
    $authorId = $body['postedByMemberId'];
    $rawText = $body['message'];
    $attachments = $body['attachments'];
    // TODO We need to parse the mentioned members from the rawText
    $timestampPosted = $body['timestamp'];
    $channelId = $args['channelId'];

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
