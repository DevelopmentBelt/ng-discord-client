CREATE TABLE IF NOT EXISTS `inbox_states` (
  `state_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT(64) NOT NULL,
  `item_key` VARCHAR(255) NOT NULL,
  `is_read` BOOLEAN DEFAULT TRUE,
  `is_deleted` BOOLEAN DEFAULT FALSE,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_inbox_state` (`user_id`, `item_key`)
);
