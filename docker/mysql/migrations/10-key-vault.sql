-- Passphrase-encrypted key vault (opaque blob; server cannot decrypt)
CREATE TABLE IF NOT EXISTS `user_key_vaults` (
  `user_id` BIGINT(64) PRIMARY KEY,
  `vault_blob` MEDIUMTEXT NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);
