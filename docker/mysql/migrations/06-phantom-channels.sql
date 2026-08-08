-- Phantom channels: anonymous + encrypted messaging
ALTER TABLE `channels`
  ADD COLUMN `is_phantom` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `phantom_salt` VARCHAR(64) NULL,
  ADD COLUMN `phantom_verifier` VARCHAR(128) NULL;

ALTER TABLE `messages`
  ADD COLUMN `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `is_encrypted` TINYINT(1) NOT NULL DEFAULT 0,
  MODIFY COLUMN `posted_by_user_id` BIGINT(64) NULL,
  MODIFY COLUMN `raw_text` TEXT NOT NULL;
