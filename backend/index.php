<?php

use App\Controllers\MemberController;
use App\Controllers\MessageController;
use App\Controllers\ServerController;
use App\Controllers\UserController;
use App\Services\DatabaseService;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$app = AppFactory::create();

$dbService = new DatabaseService();

$messageController = new MessageController($app, $dbService);
$userController = new UserController($app, $dbService);
$serverController = new ServerController($app, $dbService);
$memberController = new MemberController($app, $dbService);

$app->run();
