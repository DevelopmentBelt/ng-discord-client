-- Schema only (no seed users/servers). Prefer docker/mysql/init/01-schema.sql when using Docker.
SET NAMES utf8mb4;

DROP TABLE IF EXISTS `attachment`;
DROP TABLE IF EXISTS `message_content`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `channels`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `members`;
DROP TABLE IF EXISTS `servers`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE IF NOT EXISTS `users` (
  `user_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `user_name` VARCHAR(255) NOT NULL,
  `user_bio` TEXT(1024),
  `user_pic` TEXT(1024),
  `display_name` VARCHAR(64) NULL,
  `pronouns` VARCHAR(32) NULL,
  `custom_status` VARCHAR(128) NULL,
  `banner_url` VARCHAR(512) NULL,
  `presence_status` VARCHAR(16) NOT NULL DEFAULT 'online',
  `profile_card` VARCHAR(32) NOT NULL DEFAULT 'classic',
  `avatar_effect` VARCHAR(32) NOT NULL DEFAULT 'none',
  `email` VARCHAR(255) NOT NULL,
  `email_verified` BOOLEAN DEFAULT FALSE,
  `password` VARCHAR(256) NOT NULL,
  UNIQUE KEY `uniq_users_email` (`email`),
  UNIQUE KEY `uniq_users_username` (`user_name`)
);

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT(64) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_prt_token_hash` (`token_hash`),
  KEY `idx_prt_user_id` (`user_id`)
);

CREATE TABLE IF NOT EXISTS `servers` (
  `server_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `server_name` VARCHAR(255),
  `server_description` TEXT(1024),
  `server_icon` TEXT(1024),
  `owner_id` BIGINT(64),
  `is_public` BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS `members` (
  `member_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `member_name` VARCHAR(255),
  `user_id` BIGINT(64),
  `server_id` BIGINT(64),
  `status` VARCHAR(255),
  `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP
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
  `channel_name` VARCHAR(255),
  `is_phantom` TINYINT(1) NOT NULL DEFAULT 0,
  `phantom_key` VARCHAR(128) NULL
);

CREATE TABLE IF NOT EXISTS `messages` (
  `message_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `channel_id` BIGINT(64),
  `posted_by_user_id` BIGINT(64) NULL,
  `raw_text` TEXT NOT NULL,
  `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0,
  `is_encrypted` TINYINT(1) NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS `dm_conversations` (
  `conversation_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `is_group` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `dm_participants` (
  `participant_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` BIGINT(64) NOT NULL,
  `user_id` BIGINT(64) NOT NULL,
  `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_read_at` DATETIME NULL,
  UNIQUE KEY `uniq_dm_participant` (`conversation_id`, `user_id`)
);

CREATE TABLE IF NOT EXISTS `dm_messages` (
  `message_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` BIGINT(64) NOT NULL,
  `posted_by_user_id` BIGINT(64) NOT NULL,
  `raw_text` TEXT(1024),
  `timestamp_posted` DATETIME
);
