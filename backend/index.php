<?php

use App\Controllers\MemberController;
use App\Controllers\MessageController;
use App\Controllers\ServerController;
use App\Controllers\UserController;
use App\Services\DatabaseService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Exception\HttpNotFoundException;
use Slim\Factory\AppFactory;
use Slim\Routing\RouteCollectorProxy;

require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$app = AppFactory::create();

$app->addBodyParsingMiddleware();

$app->addRoutingMiddleware();

// Add the ErrorMiddleware before the CORS middleware
// to ensure error responses contain all CORS headers.
$app->addErrorMiddleware(true, true, true);

$corsMiddleware = function (Request $request, RequestHandlerInterface $handler) use ($app): Response {
  if ($request->getMethod() === 'OPTIONS') {
    $response = $app->getResponseFactory()->createResponse();
  } else {
    $response = $handler->handle($request);
  }

  $response = $response
    ->withHeader('Access-Control-Allow-Credentials', 'true')
    ->withHeader('Access-Control-Allow-Origin', '*')
    ->withHeader('Access-Control-Allow-Headers', '*')
    ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    ->withHeader('Pragma', 'no-cache');

  if (ob_get_contents()) {
    ob_clean();
  }

  return $response;
};

$app->add($corsMiddleware);

/**/
$dbService = new DatabaseService();
$messageController = new MessageController($app, $dbService);
$userController = new UserController($app, $dbService);
$serverController = new ServerController($app, $dbService);
$memberController = new MemberController($app, $dbService);
/**/

$errorMiddleware = $app->addErrorMiddleware(true, true, true);

$app->map(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], '/{routes:.+}', function ($request, $response) {
  throw new HttpNotFoundException($request);
});

$app->run();
