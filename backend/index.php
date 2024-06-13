<?php

use App\Controllers\MemberController;
use App\Controllers\MessageController;
use App\Controllers\ServerController;
use App\Controllers\UserController;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();

$messageController = new MessageController($app);
$userController = new UserController($app);
$serverController = new ServerController($app);
$memberController = new MemberController($app);

$app->run();
