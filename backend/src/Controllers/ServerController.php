<?php

namespace App\Controllers;

use App\Models\Server;
use App\Models\User;
use App\Services\AuthService;
use Exception;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ServerController extends Routes {
  protected function registerRoutes() {
    $this->app->get('/api/servers/', [$this, 'getServersForUser']);
    $this->app->get('/api/servers/public/', [$this, 'getPublicServers']);
    $this->app->get('/api/servers/{serverId}/channels', [$this, 'getServerChannels']);
    $this->app->get('/api/servers/{serverId}/members', [$this, 'getServerMembers']);
    $this->app->post('/api/servers/', [$this, 'createServer']);
    $this->app->post('/api/servers/{serverId}/join', [$this, 'joinServer']);
    $this->app->delete('/api/servers/{serverId}/leave', [$this, 'leaveServer']);
    $this->app->delete('/api/servers/', [$this, 'archiveServer']);
    $this->app->get('/api/servers/test/', [$this, 'testEndpoint']);
  }

  public function testEndpoint(Request $request, Response $response, $args) {
    $response->getBody()->write(json_encode(['message' => 'Server controller is working', 'timestamp' => date('Y-m-d H:i:s')]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
  }

  public function getServersForUser(Request $request, Response $response, $args) {
    try {
      $userId = AuthService::getUserId();
      error_log("getServersForUser called with user_id: " . ($userId ?? 'null'));
      
      if ($userId) {
        $pdo = $this->dbService->getConnection();
        $user = new User($userId, $pdo, false);
        $servers = $user->getServers();
        error_log("Found " . count($servers) . " servers for user");
        
        $serverObjs = [];
        foreach ($servers as $server) {
          $serverData = [
            'serverId' => $server['server_id'],
            'serverName' => $server['server_name'],
            'serverDescription' => $server['server_description'],
            'iconURL' => $server['server_icon'],
            'ownerId' => $server['owner_id']
          ];
          $serverObjs[] = $serverData;
        }
        
        error_log("Returning " . count($serverObjs) . " servers");
        $response->getBody()->write(json_encode($serverObjs));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
      } else {
        error_log("User not authenticated");
        $response->getBody()->write(json_encode(['error' => 'User not authenticated']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
      }
    } catch (Exception $e) {
      error_log("Error in getServersForUser: " . $e->getMessage());
      $response->getBody()->write(json_encode(['error' => 'Internal server error: ' . $e->getMessage()]));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
  }

  public function getPublicServers(Request $request, Response $response, $args) {
    try {
      $pdo = $this->dbService->getConnection();
      
      // Get public servers with basic information
      $query = "SELECT 
        s.server_id, 
        s.server_name, 
        s.server_description, 
        s.server_icon, 
        s.owner_id,
        COUNT(m.member_id) as member_count
      FROM servers s 
      LEFT JOIN members m ON s.server_id = m.server_id 
      WHERE s.is_public = 1 
      GROUP BY s.server_id, s.server_name, s.server_description, s.server_icon, s.owner_id
      ORDER BY member_count DESC 
      LIMIT 50";
      
      $stmt = $pdo->prepare($query);
      $stmt->execute();
      $servers = $stmt->fetchAll(PDO::FETCH_ASSOC);
      
      $serverObjs = [];
      foreach ($servers as $server) {
        $s = new Server(
          $server['server_id'],
          $pdo,
          false,
          $server['server_name'],
          $server['server_description'],
          $server['server_icon'],
          $server['owner_id']
        );
        
        // Add additional public server data
        $serverData = [
          'serverId' => $server['server_id'],
          'serverName' => $server['server_name'],
          'serverDescription' => $server['server_description'],
          'iconURL' => $server['server_icon'],
          'ownerId' => $server['owner_id'],
          'memberCount' => (int)$server['member_count'],
          'isJoined' => false, // TODO: Check if current user is a member
          'tags' => ['community'] // TODO: Implement actual tags system
        ];
        
        $serverObjs[] = $serverData;
      }
      
      $response->getBody()->write(json_encode($serverObjs));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
      $response->getBody()->write(json_encode(['error' => 'Failed to fetch public servers']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
  }

  public function getServerChannels(Request $request, Response $response, $args) {
    try {
      $serverId = (int) $args['serverId'];
      $pdo = $this->dbService->getConnection();

      $categoryStmt = $pdo->prepare(
        "SELECT category_id, server_id, category_name, category_icon
         FROM categories
         WHERE server_id = ?
         ORDER BY category_id ASC"
      );
      $categoryStmt->execute([$serverId]);
      $categories = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);

      // Ensure every server has at least a default text channel
      if (count($categories) === 0) {
        $pdo->prepare("INSERT INTO categories (server_id, category_name, category_icon) VALUES (?, 'Text Channels', NULL)")
          ->execute([$serverId]);
        $categoryId = (int) $pdo->lastInsertId();
        $pdo->prepare("INSERT INTO channels (category_id, channel_name) VALUES (?, 'general')")
          ->execute([$categoryId]);
        $categoryStmt->execute([$serverId]);
        $categories = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);
      }

      $channelStmt = $pdo->prepare(
        "SELECT channel_id, category_id, channel_name
         FROM channels
         WHERE category_id = ?
         ORDER BY channel_id ASC"
      );

      $result = [];
      foreach ($categories as $category) {
        $channelStmt->execute([$category['category_id']]);
        $channels = [];
        foreach ($channelStmt->fetchAll(PDO::FETCH_ASSOC) as $channel) {
          $channels[] = [
            'channelId' => (int) $channel['channel_id'],
            'categoryId' => (int) $channel['category_id'],
            'channelName' => $channel['channel_name'],
          ];
        }

        $result[] = [
          'categoryId' => (int) $category['category_id'],
          'serverId' => (int) $category['server_id'],
          'categoryName' => $category['category_name'],
          'categoryIcon' => $category['category_icon'],
          'channels' => $channels,
        ];
      }

      $response->getBody()->write(json_encode($result));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
      error_log('Error in getServerChannels: ' . $e->getMessage());
      $response->getBody()->write(json_encode(['error' => 'Failed to fetch server channels']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
  }

  public function getServerMembers(Request $request, Response $response, $args) {
    try {
      $userId = AuthService::getUserId();
      if (!$userId) {
        $response->getBody()->write(json_encode(['error' => 'User not authenticated']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
      }

      $serverId = (int) $args['serverId'];
      $pdo = $this->dbService->getConnection();

      $serverStmt = $pdo->prepare('SELECT owner_id FROM servers WHERE server_id = ?');
      $serverStmt->execute([$serverId]);
      $server = $serverStmt->fetch(PDO::FETCH_ASSOC);
      if (!$server) {
        $response->getBody()->write(json_encode(['error' => 'Server not found']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
      }
      $ownerId = (int) $server['owner_id'];

      $userStmt = $pdo->prepare('SELECT user_name FROM users WHERE user_id = ?');
      $userStmt->execute([$userId]);
      $username = $userStmt->fetchColumn() ?: null;

      // Ensure the current user has a membership row (owners can be missing from older creates)
      $membershipStmt = $pdo->prepare('SELECT member_id FROM members WHERE user_id = ? AND server_id = ?');
      $membershipStmt->execute([$userId, $serverId]);
      $membership = $membershipStmt->fetch(PDO::FETCH_ASSOC);

      if (!$membership) {
        if ($userId !== $ownerId) {
          $response->getBody()->write(json_encode(['error' => 'Not a member of this server']));
          return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        $pdo->prepare(
          "INSERT INTO members (member_name, user_id, server_id, status, joined_at)
           VALUES (?, ?, ?, 'online', NOW())"
        )->execute([$username, $userId, $serverId]);
      } else {
        $pdo->prepare(
          "UPDATE members
           SET status = 'online',
               member_name = COALESCE(NULLIF(member_name, ''), ?)
           WHERE user_id = ? AND server_id = ?"
        )->execute([$username, $userId, $serverId]);
      }

      $stmt = $pdo->prepare(
        "SELECT m.member_id, m.member_name, m.user_id, m.status, m.joined_at,
                u.user_name, u.user_pic
         FROM members m
         INNER JOIN users u ON u.user_id = m.user_id
         WHERE m.server_id = ?
         ORDER BY
           CASE WHEN m.user_id = ? THEN 0 ELSE 1 END,
           CASE WHEN COALESCE(m.status, 'offline') = 'offline' THEN 1 ELSE 0 END,
           COALESCE(m.member_name, u.user_name) ASC"
      );
      $stmt->execute([$serverId, $ownerId]);
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

      $members = [];
      foreach ($rows as $row) {
        $memberUserId = (int) $row['user_id'];
        $isOwner = $memberUserId === $ownerId;
        $displayName = $row['member_name'] ?: $row['user_name'];
        $status = strtolower((string) ($row['status'] ?: 'offline'));
        if (!in_array($status, ['online', 'idle', 'dnd', 'offline'], true)) {
          $status = 'offline';
        }

        $roles = $isOwner ? ['Owner'] : ['Member'];

        $members[] = [
          'memberId' => (string) $row['member_id'],
          'memberName' => $displayName,
          'userId' => $memberUserId,
          'username' => $row['user_name'],
          'userPic' => $row['user_pic'] ?? '',
          'status' => $status,
          'roles' => $roles,
          'joinedAt' => $row['joined_at'],
          'isOwner' => $isOwner,
          'isAdmin' => $isOwner,
          'canManageMembers' => $isOwner,
          'canManageChannels' => $isOwner,
          'canManageRoles' => $isOwner,
        ];
      }

      $response->getBody()->write(json_encode($members));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
      error_log('Error in getServerMembers: ' . $e->getMessage());
      $response->getBody()->write(json_encode(['error' => 'Failed to fetch server members']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
  }

  public function joinServer(Request $request, Response $response, $args) {
    try {
      $userId = AuthService::getUserId();
      $serverId = $args['serverId'];
      
      if (!$userId) {
        $response->getBody()->write(json_encode(['error' => 'User not authenticated']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
      }
      
      $pdo = $this->dbService->getConnection();
      
      // Check if user is already a member
      $checkQuery = "SELECT member_id FROM members WHERE user_id = ? AND server_id = ?";
      $checkStmt = $pdo->prepare($checkQuery);
      $checkStmt->execute([$userId, $serverId]);
      
      if ($checkStmt->fetch()) {
        $response->getBody()->write(json_encode(['error' => 'User is already a member of this server']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
      }
      
      $userStmt = $pdo->prepare('SELECT user_name FROM users WHERE user_id = ?');
      $userStmt->execute([$userId]);
      $username = $userStmt->fetchColumn() ?: null;

      // Add user to server
      $insertQuery = "INSERT INTO members (member_name, user_id, server_id, status, joined_at) VALUES (?, ?, ?, 'online', NOW())";
      $insertStmt = $pdo->prepare($insertQuery);
      $insertStmt->execute([$username, $userId, $serverId]);
      
      $response->getBody()->write(json_encode(['success' => true, 'message' => 'Successfully joined server']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
      $response->getBody()->write(json_encode(['error' => 'Failed to join server']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
  }

  public function leaveServer(Request $request, Response $response, $args) {
    try {
      $userId = AuthService::getUserId();
      $serverId = $args['serverId'];
      
      if (!$userId) {
        $response->getBody()->write(json_encode(['error' => 'User not authenticated']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
      }
      
      $pdo = $this->dbService->getConnection();
      
      // Remove user from server
      $deleteQuery = "DELETE FROM members WHERE user_id = ? AND server_id = ?";
      $deleteStmt = $pdo->prepare($deleteQuery);
      $deleteStmt->execute([$userId, $serverId]);
      
      if ($deleteStmt->rowCount() === 0) {
        $response->getBody()->write(json_encode(['error' => 'User is not a member of this server']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
      }
      
      $response->getBody()->write(json_encode(['success' => true, 'message' => 'Successfully left server']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
      $response->getBody()->write(json_encode(['error' => 'Failed to leave server']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
  }

  public function createServer(Request $request, Response $response, $args) {
    try {
      $userId = AuthService::getUserId();
      if (!$userId) {
        $response->getBody()->write(json_encode(['error' => 'User not authenticated']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
      }

      $data = $request->getParsedBody();
      $serverName = $data['serverName'] ?? '';
      $serverDescription = $data['serverDescription'] ?? '';
      
      if (empty($serverName)) {
        $response->getBody()->write(json_encode(['error' => 'Server name is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
      }

      $pdo = $this->dbService->getConnection();
      
      // Create the server
      $insertQuery = "INSERT INTO servers (server_name, server_description, owner_id) VALUES (?, ?, ?)";
      $insertStmt = $pdo->prepare($insertQuery);
      $insertStmt->execute([$serverName, $serverDescription, $userId]);
      
      $serverId = $pdo->lastInsertId();
      
      $userStmt = $pdo->prepare('SELECT user_name FROM users WHERE user_id = ?');
      $userStmt->execute([$userId]);
      $username = $userStmt->fetchColumn() ?: null;

      // Add the creator as a member
      $memberQuery = "INSERT INTO members (member_name, user_id, server_id, status, joined_at) VALUES (?, ?, ?, 'online', NOW())";
      $memberStmt = $pdo->prepare($memberQuery);
      $memberStmt->execute([$username, $userId, $serverId]);

      // Default category + #general so the new server is immediately usable
      $pdo->prepare("INSERT INTO categories (server_id, category_name, category_icon) VALUES (?, 'Text Channels', NULL)")
        ->execute([$serverId]);
      $categoryId = $pdo->lastInsertId();
      $pdo->prepare("INSERT INTO channels (category_id, channel_name) VALUES (?, 'general')")
        ->execute([$categoryId]);
      
      // Return the created server data
      $serverData = [
        'serverId' => $serverId,
        'serverName' => $serverName,
        'serverDescription' => $serverDescription,
        'iconURL' => '', // Default empty icon
        'ownerId' => $userId
      ];
      
      $response->getBody()->write(json_encode($serverData));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
      $response->getBody()->write(json_encode(['error' => 'Failed to create server']));
      return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
  }
  
  public function archiveServer(Request $request, Response $response, $args) {
    // TODO: Implement server archiving functionality
    $response->getBody()->write(json_encode(['message' => 'Archive server functionality not yet implemented']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(501);
  }
}
