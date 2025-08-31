<?php

namespace App\Controllers;

use App\Models\Server;
use App\Models\User;
use Exception;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

$_SESSION['user_id'] = 1; // TODO GET RID OF THIS, only used for testing using badger account

class ServerController extends Routes {
  protected function registerRoutes() {
    $this->app->get('/api/servers/', [$this, 'getServersForUser']);
    $this->app->get('/api/servers/public/', [$this, 'getPublicServers']);
    $this->app->post('/api/servers/', [$this, 'createServer']);
    $this->app->post('/api/servers/{serverId}/join', [$this, 'joinServer']);
    $this->app->delete('/api/servers/{serverId}/leave', [$this, 'leaveServer']);
    $this->app->delete('/api/servers/', [$this, 'archiveServer']);
    $this->app->get('/api/servers/test/', [$this, 'testEndpoint']);
  }

  public function testEndpoint(Request $request, Response $response, $args) {
    return $response->withJson(['message' => 'Server controller is working', 'timestamp' => date('Y-m-d H:i:s')]);
  }

  public function getServersForUser(Request $request, Response $response, $args) {
    try {
      $userId = $_SESSION['user_id'];
      error_log("getServersForUser called with user_id: " . $userId);
      
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
        return $response->withJson($serverObjs);
      } else {
        error_log("User not authenticated");
        return $response->withStatus(401)->withJson(['error' => 'User not authenticated']);
      }
    } catch (Exception $e) {
      error_log("Error in getServersForUser: " . $e->getMessage());
      return $response->withStatus(500)->withJson(['error' => 'Internal server error: ' . $e->getMessage()]);
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
      
      return $response->withJson($serverObjs);
    } catch (Exception $e) {
      return $response->withStatus(500)->withJson(['error' => 'Failed to fetch public servers']);
    }
  }

  public function joinServer(Request $request, Response $response, $args) {
    try {
      $userId = $_SESSION['user_id'];
      $serverId = $args['serverId'];
      
      if (!$userId) {
        return $response->withStatus(401)->withJson(['error' => 'User not authenticated']);
      }
      
      $pdo = $this->dbService->getConnection();
      
      // Check if user is already a member
      $checkQuery = "SELECT member_id FROM members WHERE user_id = ? AND server_id = ?";
      $checkStmt = $pdo->prepare($checkQuery);
      $checkStmt->execute([$userId, $serverId]);
      
      if ($checkStmt->fetch()) {
        return $response->withStatus(400)->withJson(['error' => 'User is already a member of this server']);
      }
      
      // Add user to server
      $insertQuery = "INSERT INTO members (user_id, server_id, joined_at) VALUES (?, ?, NOW())";
      $insertStmt = $pdo->prepare($insertQuery);
      $insertStmt->execute([$userId, $serverId]);
      
      return $response->withJson(['success' => true, 'message' => 'Successfully joined server']);
    } catch (Exception $e) {
      return $response->withStatus(500)->withJson(['error' => 'Failed to join server']);
    }
  }

  public function leaveServer(Request $request, Response $response, $args) {
    try {
      $userId = $_SESSION['user_id'];
      $serverId = $args['serverId'];
      
      if (!$userId) {
        return $response->withStatus(401)->withJson(['error' => 'User not authenticated']);
      }
      
      $pdo = $this->dbService->getConnection();
      
      // Remove user from server
      $deleteQuery = "DELETE FROM members WHERE user_id = ? AND server_id = ?";
      $deleteStmt = $pdo->prepare($deleteQuery);
      $deleteStmt->execute([$userId, $serverId]);
      
      if ($deleteStmt->rowCount() === 0) {
        return $response->withStatus(400)->withJson(['error' => 'User is not a member of this server']);
      }
      
      return $response->withJson(['success' => true, 'message' => 'Successfully left server']);
    } catch (Exception $e) {
      return $response->withStatus(500)->withJson(['error' => 'Failed to leave server']);
    }
  }

  public function createServer(Request $request, Response $response, $args) {
    try {
      $userId = $_SESSION['user_id'];
      if (!$userId) {
        return $response->withStatus(401)->withJson(['error' => 'User not authenticated']);
      }

      $data = $request->getParsedBody();
      $serverName = $data['serverName'] ?? '';
      $serverDescription = $data['serverDescription'] ?? '';
      
      if (empty($serverName)) {
        return $response->withStatus(400)->withJson(['error' => 'Server name is required']);
      }

      $pdo = $this->dbService->getConnection();
      
      // Create the server
      $insertQuery = "INSERT INTO servers (server_name, server_description, owner_id) VALUES (?, ?, ?)";
      $insertStmt = $pdo->prepare($insertQuery);
      $insertStmt->execute([$serverName, $serverDescription, $userId]);
      
      $serverId = $pdo->lastInsertId();
      
      // Add the creator as a member
      $memberQuery = "INSERT INTO members (user_id, server_id, joined_at) VALUES (?, ?, NOW())";
      $memberStmt = $pdo->prepare($memberQuery);
      $memberStmt->execute([$userId, $serverId]);
      
      // Return the created server data
      $serverData = [
        'serverId' => $serverId,
        'serverName' => $serverName,
        'serverDescription' => $serverDescription,
        'iconURL' => '', // Default empty icon
        'ownerId' => $userId
      ];
      
      return $response->withJson($serverData);
    } catch (Exception $e) {
      return $response->withStatus(500)->withJson(['error' => 'Failed to create server']);
    }
  }
  public function archiveServer(Request $request, Response $response, $args) {}
}
