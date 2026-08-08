-- Privacy-first invites for private communities
CREATE TABLE IF NOT EXISTS `server_invites` (
  `invite_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `server_id` BIGINT(64) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `created_by_user_id` BIGINT(64) NOT NULL,
  `max_uses` INT NOT NULL DEFAULT 0,
  `uses` INT NOT NULL DEFAULT 0,
  `expires_at` DATETIME NULL,
  `revoked_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_server_invite_code` (`code`),
  KEY `idx_server_invites_server` (`server_id`)
);
