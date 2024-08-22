<?php

namespace App\Controllers;

session_start();

use App\Services\DatabaseService;
use Slim\App;

abstract class Routes
{
  protected App $app;
  protected DatabaseService $dbService;

  public function __construct(App $app, DatabaseService $dbService)
  {
    $this->dbService = $dbService;
    $this->app = $app;
    $this->registerRoutes();
  }

  abstract protected function registerRoutes();
}
