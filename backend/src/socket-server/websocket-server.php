<?php

use Ratchet\App;
use Ratchet\Http\HttpServer;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;

// Make sure composer dependencies have been installed
require __DIR__ . '/../../vendor/autoload.php';

error_reporting(E_ALL ^ E_DEPRECATED);

/**
 * chat.php
 * Send any incoming messages to all connected clients (except sender)
 */
class BaseSocketListener implements MessageComponentInterface {
  protected $clients;

  public function __construct() {
    $this->clients = new \SplObjectStorage;
  }

  public function onOpen(ConnectionInterface $conn) {
    $this->clients->attach($conn);
  }

  public function onMessage(ConnectionInterface $from, $msg) {
    foreach ($this->clients as $client) {
      $client->send($msg);
    }
  }

  public function onClose(ConnectionInterface $conn) {
    $this->clients->detach($conn);
  }

  public function onError(ConnectionInterface $conn, \Exception $e) {
    $conn->close();
  }
}

// httpHost must match the browser URL (ws://localhost:...); bind on all interfaces for Docker
$httpHost = getenv('WS_HTTP_HOST') ?: 'localhost';
$port = (int) (getenv('WS_PORT') ?: 8080);
$bindAddress = getenv('WS_HOST') ?: '0.0.0.0';
$app = new App($httpHost, $port, $bindAddress);

$app->route('/base', new WsServer(new BaseSocketListener()), ['*']);
$app->route('/channel', new WsServer(new BaseSocketListener()), ['*']);

$app->run();
