<?php

use App\Controllers\MemberController;
use App\Controllers\MessageController;
use App\Controllers\ServerController;
use App\Controllers\UserController;
use App\Services\DatabaseService;
use App\Services\UtilService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Exception\HttpNotFoundException;
use Slim\Factory\AppFactory;

require __DIR__ . '/vendor/autoload.php';

if (is_readable(__DIR__ . '/.env')) {
  $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
  $dotenv->safeLoad();
}

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  session_start();
}

$app = AppFactory::create();

$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();

$dbService = new DatabaseService();
$utils = new UtilService();
$messageController = new MessageController($app, $dbService, $utils);
$userController = new UserController($app, $dbService, $utils);
$serverController = new ServerController($app, $dbService, $utils);
$memberController = new MemberController($app, $dbService, $utils);

$app->map(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], '/{routes:.+}', function ($request, $response) {
  throw new HttpNotFoundException($request);
});

$app->options('/{routes:.+}', function (Request $request, Response $response) {
  return $response->withStatus(204);
});

$errorMiddleware = $app->addErrorMiddleware(true, true, true);

$corsMiddleware = function (Request $request, RequestHandlerInterface $handler) use ($app): Response {
  if ($request->getMethod() === 'OPTIONS') {
    $response = $app->getResponseFactory()->createResponse(204);
  } else {
    $response = $handler->handle($request);
  }

  $origin = $request->getHeaderLine('Origin');
  if ($origin === '') {
    $origin = '*';
  }

  return $response
    ->withHeader('Access-Control-Allow-Origin', $origin)
    ->withHeader('Access-Control-Allow-Credentials', 'true')
    ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    ->withHeader('Access-Control-Max-Age', '86400')
    ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    ->withHeader('Pragma', 'no-cache')
    ->withHeader('Vary', 'Origin');
};

// Added last so it runs first and wraps errors with CORS headers
$app->add($corsMiddleware);

$app->run();
