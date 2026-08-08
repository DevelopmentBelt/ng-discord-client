-- Run once against an existing database for expanded profile fields.
ALTER TABLE `users`
  ADD COLUMN `display_name` VARCHAR(64) NULL,
  ADD COLUMN `pronouns` VARCHAR(32) NULL,
  ADD COLUMN `custom_status` VARCHAR(128) NULL,
  ADD COLUMN `banner_url` VARCHAR(512) NULL,
  ADD COLUMN `presence_status` VARCHAR(16) NOT NULL DEFAULT 'online';
