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
