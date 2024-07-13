<?php

namespace App\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class MessageController extends Routes {
  protected function registerRoutes() {
    $this->app->post('/api/messages/{channelId}', [$this, 'postMessage']);
    $this->app->delete('/api/messages', [$this, 'deleteMessage']);
  }

  public function postMessage(Request $request, Response $response, $args): Response {
    $body = $request->getParsedBody();
    $authorId = $body['postedByUserId'];
    $rawText = $body['message'];
    $attachments = $body['attachments'];
    // TODO We need to parse the mentioned members from the rawText
    $timestampPosted = $body['timestamp'];
    $channelId = $body['channelId'];
    return $response;
  }

  public function deleteMessage(Request $request, Response $response, $args): Response {
    // TODO We need to delete the message and attachments
    return $response;
  }
}
