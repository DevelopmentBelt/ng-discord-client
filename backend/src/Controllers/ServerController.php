<?php

namespace App\Controllers;

use App\Models\Server;
use App\Models\User;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

$_SESSION['user_id'] = 1; // TODO GET RID OF THIS, only used for testing using badger account

class ServerController extends Routes {
  protected function registerRoutes() {
    $this->app->get('/api/servers/', [$this, 'getServersForUser']);
    $this->app->post('/api/servers/', [$this, 'createServer']);
    $this->app->delete('/api/servers/', [$this, 'archiveServer']);
  }

  public function getServersForUser(Request $request, Response $response, $args) {
    $userId = $_SESSION['user_id'];
    if ($userId) {
      $pdo = $this->dbService->getConnection();
      $user = new User($userId, $pdo, false);
      $servers = $user->getServers();
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
        $serverObjs[] = $s;
      }
      return $response->withJson($serverObjs);
    } else {
      // TODO Not logged in, error...
    }
  }
  public function createServer(Request $request, Response $response, $args) {}
  public function archiveServer(Request $request, Response $response, $args) {}
}
