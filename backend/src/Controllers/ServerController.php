<?php

namespace App\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ServerController extends Routes {
  protected function registerRoutes() {}

  public function getServersForUser(Request $request, Response $response, $args) {}
  public function createServer(Request $request, Response $response, $args) {}
  public function archiveServer(Request $request, Response $response, $args) {}
}
