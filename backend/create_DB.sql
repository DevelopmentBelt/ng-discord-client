DROP TABLE IF EXISTS `servers`;
DROP TABLE IF EXISTS `members`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `message_content`;
DROP TABLE IF EXISTS `attachment`;

CREATE TABLE IF NOT EXISTS `servers` (
  `server_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `server_name` VARCHAR(255),
  `server_description` TEXT(1024),
  `server_icon` TEXT(1024),
  `owner_id` BIGINT(64)
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

INSERT INTO `users` (`user_name`, `user_bio`, `user_pic`, `email`, `email_verified`, `password`)
VALUES ("badger", null, null, "thewolfbadger@gmail.com", true, "$2y$15$OegX3WOx5wps82XPr79hneJRkVHYA91s2sthUPh1vV1Hn5xwVqpSi");

CREATE TABLE IF NOT EXISTS `members` (
  `member_name` VARCHAR(255),
  `user_id` BIGINT(64),
  `status` VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `server_id` BIGINT(64),
  `category_name` VARCHAR(255),
  `category_icon` TEXT(1024)
);

CREATE TABLE IF NOT EXISTS `channels` (
  `channel_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `category_id` BIGINT(64),
  `channel_name` VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS `messages` (
  `message_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `channel_id` BIGINT(64),
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
