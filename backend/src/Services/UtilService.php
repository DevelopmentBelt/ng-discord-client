<?php

namespace App\Services;
class UtilService
{
  public static function toMessageModel($dbService, $msg)
  {
    $msg_id = $msg['message_id'];
    $channel_id = $msg['channel_id'];
    $posted_by_user_id = $msg['posted_by_user_id'];
    $raw_text = $msg['raw_text'];
    $timestamp_posted = $msg['timestamp_posted'];
    return [
      'id' => $msg_id,
      'text' => $raw_text,
      'rawText' => $raw_text,
      'postedTimestamp' => $timestamp_posted,
      'channelId' => $channel_id,
      'author' => [
        'userId' => $posted_by_user_id,
        'username' => $msg['user_name'],
        'profilePic' => $msg['user_pic']
      ]
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
