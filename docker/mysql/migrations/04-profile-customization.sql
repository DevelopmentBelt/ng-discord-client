ALTER TABLE `users`
  ADD COLUMN `profile_card` VARCHAR(32) NOT NULL DEFAULT 'classic',
  ADD COLUMN `avatar_effect` VARCHAR(32) NOT NULL DEFAULT 'none';
