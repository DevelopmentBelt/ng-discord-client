<?php

namespace App\Services;

class UtilService
{
  public static function toMessageModel($dbService, $msg)
  {
    $msg_id = $msg['message_id'];
    $channel_id = $msg['channel_id'];
    $raw_text = $msg['raw_text'];
    $timestamp_posted = $msg['timestamp_posted'];
    $isAnonymous = !empty($msg['is_anonymous']) || empty($msg['posted_by_user_id']);
    $isEncrypted = !empty($msg['is_encrypted']) || str_starts_with((string) $raw_text, 'PHANTOM1:');

    if ($isAnonymous) {
      $author = [
        'userId' => 0,
        'username' => 'Anonymous',
        'profilePic' => '',
      ];
    } else {
      $author = [
        'userId' => (int) $msg['posted_by_user_id'],
        'username' => $msg['user_name'] ?? 'Unknown',
        'profilePic' => $msg['user_pic'] ?? '',
      ];
    }

    return [
      'id' => $msg_id,
      'text' => $raw_text,
      'rawText' => $raw_text,
      'postedTimestamp' => $timestamp_posted,
      'channelId' => $channel_id,
      'isAnonymous' => $isAnonymous,
      'isEncrypted' => $isEncrypted,
      'expiresAt' => $msg['expires_at'] ?? null,
      'author' => $author,
    ];
  }

  public static function toUserModel($user)
  {
  }

  public static function toServerModel($server)
  {
  }

  public static function toMemberModel($member)
  {
  }

  public static function toChannelModel($channel)
  {
  }

  public static function toCategoryModel($category)
  {
  }
}
