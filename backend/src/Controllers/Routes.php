<?php

namespace App\Controllers;

use App\Services\DatabaseService;
use App\Services\Utils;
use App\Services\UtilService;
use PDO;
use Slim\App;

abstract class Routes
{
  protected App $app;
  protected DatabaseService $dbService;
  protected UtilService $utils;

  /**
   * Per-process schema-check cache (M3).
   * Avoids repeated DDL queries inside a single PHP-FPM worker lifetime.
   */
  private static array $schemaCache = [];

  public function __construct(App $app, DatabaseService $dbService, UtilService $utils)
  {
    $this->utils = $utils;
    $this->dbService = $dbService;
    $this->app = $app;
    $this->registerRoutes();
  }

  abstract protected function registerRoutes();

  /** Returns true if the DDL guard for $key has already run in this process. */
  protected function schemaChecked(string $key): bool
  {
    return isset(self::$schemaCache[$key]);
  }

  /** Mark a DDL guard as done for this process. */
  protected function markSchemaChecked(string $key): void
  {
    self::$schemaCache[$key] = true;
  }

  /** Helper: add a column to a table if it does not already exist (cached). */
  protected function ensureColumn(PDO $pdo, string $table, string $column, string $definition): void
  {
    $key = "col:{$table}.{$column}";
    if ($this->schemaChecked($key)) {
      return;
    }
    $this->markSchemaChecked($key);

    $stmt = $pdo->prepare(
      'SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $column]);
    if ((int) $stmt->fetchColumn() === 0) {
      $pdo->exec('ALTER TABLE `' . $table . '` ADD COLUMN `' . $column . '` ' . $definition);
    }
  }
}
