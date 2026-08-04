<?php

namespace App\Controllers;

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start();
}

use App\Services\DatabaseService;
use App\Services\Utils;
use App\Services\UtilService;
use Slim\App;

abstract class Routes
{
  protected App $app;
  protected DatabaseService $dbService;

  protected UtilService $utils;

  public function __construct(App $app, DatabaseService $dbService, UtilService $utils)
  {
    $this->utils = $utils;
    $this->dbService = $dbService;
    $this->app = $app;
    $this->registerRoutes();
  }

  abstract protected function registerRoutes();
}
