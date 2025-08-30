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
    
    // Inbox endpoints
    $this->app->get('/api/inbox', [$this, 'getInboxItems']);
    $this->app->put('/api/inbox/{itemId}/read', [$this, 'markInboxItemAsRead']);
    $this->app->delete('/api/inbox/{itemId}', [$this, 'deleteInboxItem']);
  }

  public function getMessages(Request $request, Response $response, $args) {
    $channelId = $args['channelId'];
    $conn = $this->dbService->getConnection();
    $stmt = $conn->prepare("SELECT *, user_name, user_pic FROM `messages` JOIN `users` ON (`messages`.posted_by_user_id = `users`.user_id)  WHERE `channel_id` = ?
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

  /**
   * Get inbox items for the current user
   */
  public function getInboxItems(Request $request, Response $response, $args): Response {
    // TODO: Get user ID from authentication
    $userId = 1; // Mock user ID for now
    
    $conn = $this->dbService->getConnection();
    
    // Get mentions
    $stmt = $conn->prepare("
      SELECT m.*, u.user_name, u.user_pic, 'mention' as type, 
             'You were mentioned in a message' as title,
             m.raw_text as content,
             m.timestamp_posted as timestamp,
             0 as is_read,
             'high' as priority
      FROM messages m 
      JOIN users u ON m.posted_by_user_id = u.user_id 
      WHERE m.raw_text LIKE '%@user%' 
      ORDER BY m.timestamp_posted DESC 
      LIMIT 50
    ");
    
    $stmt->execute();
    $mentions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get direct messages (mock data for now)
    $directMessages = [
      [
        'id' => 'dm_1',
        'type' => 'direct_message',
        'title' => 'New message from John Doe',
        'content' => 'Hey! How are you doing?',
        'timestamp' => date('Y-m-d H:i:s', strtotime('-5 minutes')),
        'is_read' => 0,
        'priority' => 'medium',
        'sender_name' => 'John Doe',
        'sender_pic' => 'https://via.placeholder.com/40/7289da/ffffff?text=J'
      ]
    ];
    
    // Get server invites (mock data for now)
    $serverInvites = [
      [
        'id' => 'invite_1',
        'type' => 'server_invite',
        'title' => 'Invitation to join Gaming Community',
        'content' => 'You have been invited to join the Gaming Community server',
        'timestamp' => date('Y-m-d H:i:s', strtotime('-1 hour')),
        'is_read' => 1,
        'priority' => 'low',
        'sender_name' => 'Gaming Bot',
        'sender_pic' => 'https://via.placeholder.com/40/faa61a/ffffff?text=G'
      ]
    ];
    
    // Combine all inbox items
    $inboxItems = array_merge($mentions, $directMessages, $serverInvites);
    
    // Sort by timestamp (newest first)
    usort($inboxItems, function($a, $b) {
      return strtotime($b['timestamp']) - strtotime($a['timestamp']);
    });
    
    $response->getBody()->write(json_encode($inboxItems, JSON_PRETTY_PRINT));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
  }

  /**
   * Mark inbox item as read
   */
  public function markInboxItemAsRead(Request $request, Response $response, $args): Response {
    $itemId = $args['itemId'];
    
    // TODO: Implement actual marking as read logic
    // For now, just return success
    
    $response->getBody()->write(json_encode(['success' => true]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
  }

  /**
   * Delete inbox item
   */
  public function deleteInboxItem(Request $request, Response $response, $args): Response {
    $itemId = $args['itemId'];
    
    // TODO: Implement actual deletion logic
    // For now, just return success
    
    $response->getBody()->write(json_encode(['success' => true]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
  }
}
