<?php

namespace App\Controllers;

use Slim\App;

abstract class Routes
{
  protected $app;

  public function __construct(App $app)
  {
    $this->app = $app;
    $this->registerRoutes();
  }

  abstract protected function registerRoutes();
}
