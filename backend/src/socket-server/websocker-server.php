<?php

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
class MyChat implements MessageComponentInterface {
  protected $clients;

  public function __construct() {
    $this->clients = new \SplObjectStorage;
  }

  public function onOpen(ConnectionInterface $conn) {
    var_dump($conn);
    $this->clients->attach($conn);
  }

  public function onMessage(ConnectionInterface $from, $msg) {
    echo '[DEBUG] msg => ' . $msg . "\n";
    var_dump($msg);
    foreach ($this->clients as $client) {
      if ($from != $client) {
        $client->send($msg);
      }
    }
  }

  public function onClose(ConnectionInterface $conn) {
    $this->clients->detach($conn);
  }

  public function onError(ConnectionInterface $conn, \Exception $e) {
    $conn->close();
  }
}

// Run the server application through the WebSocket protocol on port 8080
$server = IoServer::factory(
  new HttpServer(
    new WsServer(
      new MyChat()
    )
  ),
  8080
);

$server->run();
