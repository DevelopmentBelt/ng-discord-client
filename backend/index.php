<?php

use App\Controllers\MemberController;
use App\Controllers\MessageController;
use App\Controllers\ServerController;
use App\Controllers\UserController;
use App\Services\DatabaseService;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Slim\Factory\AppFactory;
use Slim\Logger;

require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$app = AppFactory::create();

$app->addRoutingMiddleware();

$dbService = new DatabaseService();
//
$messageController = new MessageController($app, $dbService);
$userController = new UserController($app, $dbService);
$serverController = new ServerController($app, $dbService);
$memberController = new MemberController($app, $dbService);

$app->get('/', function (Request $request, Response $response, $args) {
  $response->getBody()->write("Hello world!");
  return $response;
});

$app->run();
