CREATE TABLE IF NOT EXISTS `servers` (
  `server_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `server_name` VARCHAR(255),
  `server_description` TEXT(1024),
  `server_icon` TEXT(1024),
  `owner_id` BIGINT(64)
);

CREATE TABLE IF NOT EXISTS `members` (
  `member_name` VARCHAR(255),
  `user_id` BIGINT(64)
);

CREATE TABLE IF NOT EXISTS `users` (
  `user_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `user_name` VARCHAR(255),
  `user_bio` TEXT(1024),
  `user_pic` TEXT(1024),
  `email` VARCHAR(255),
  `email_verified` BOOLEAN,
  `password` VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS `messages` (
  `message_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `posted_by_user_id` BIGINT(64),
  `raw_text` TEXT(1024),
  `timestamp_posted` DATETIME
);

CREATE TABLE IF NOT EXISTS `message_content` (
  `message_id` BIGINT(64),
  `mentioned_members` TEXT(1024)
);

CREATE TABLE IF NOT EXISTS `attachment` (
  `attachment_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `attachment_data` TEXT(4024),
  `message_id` BIGINT(64)
);
