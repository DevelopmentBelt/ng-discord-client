<?php

use App\Controllers\MemberController;
use App\Controllers\MessageController;
use App\Controllers\ServerController;
use App\Controllers\UserController;
use App\Services\DatabaseService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Factory\AppFactory;
use Slim\Routing\RouteCollectorProxy;

require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$app = AppFactory::create();

$app->addBodyParsingMiddleware();

// Add the ErrorMiddleware before the CORS middleware
// to ensure error responses contain all CORS headers.
$app->addErrorMiddleware(true, true, true);

$corsMiddleware = function (Request $request, RequestHandlerInterface $handler): Response {
  $response = $handler->handle($request);
  return $response
    ->withHeader('Access-Control-Allow-Origin', '*')
    ->withHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT')
    ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
};

$app->options('/{routes:.+}', function ($request, $response, $args) {
  return $response;
});

$app->add($corsMiddleware);

/**/
$dbService = new DatabaseService();
$messageController = new MessageController($app, $dbService);
$userController = new UserController($app, $dbService);
$serverController = new ServerController($app, $dbService);
$memberController = new MemberController($app, $dbService);
/**/

$app->addRoutingMiddleware();
$errorMiddleware = $app->addErrorMiddleware(true, true, true);

$app->run();
