-- True E2EE + privacy upgrades
ALTER TABLE `users`
  ADD COLUMN `public_key` TEXT NULL,
  ADD COLUMN `dm_policy` VARCHAR(32) NOT NULL DEFAULT 'allowlist';

ALTER TABLE `channels`
  ADD COLUMN `ephemeral_ttl_seconds` INT NOT NULL DEFAULT 0;

ALTER TABLE `messages`
  ADD COLUMN `expires_at` DATETIME NULL;

ALTER TABLE `members`
  ADD COLUMN `alias_name` VARCHAR(64) NULL,
  ADD COLUMN `alias_pic` VARCHAR(512) NULL;

CREATE TABLE IF NOT EXISTS `channel_key_shares` (
  `share_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `channel_id` BIGINT(64) NOT NULL,
  `user_id` BIGINT(64) NOT NULL,
  `wrapped_key` TEXT NOT NULL,
  `created_by_user_id` BIGINT(64) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_channel_user_share` (`channel_id`, `user_id`),
  KEY `idx_cks_channel` (`channel_id`)
);

CREATE TABLE IF NOT EXISTS `dm_allowlist` (
  `user_id` BIGINT(64) NOT NULL,
  `allowed_user_id` BIGINT(64) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `allowed_user_id`)
);
