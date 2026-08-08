-- Run once against an existing database to enable forgot-password.
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
