-- Channel-scoped Phantom display names (pseudonyms)
ALTER TABLE `messages`
  ADD COLUMN `phantom_persona_id` BIGINT(64) NULL,
  ADD COLUMN `phantom_author` VARCHAR(64) NULL;

CREATE TABLE IF NOT EXISTS `channel_phantom_personas` (
  `persona_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `channel_id` BIGINT(64) NOT NULL,
  `user_id` BIGINT(64) NOT NULL,
  `display_name` VARCHAR(64) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_channel_user_persona` (`channel_id`, `user_id`),
  UNIQUE KEY `uniq_channel_display_name` (`channel_id`, `display_name`),
  KEY `idx_cpp_channel` (`channel_id`)
);
