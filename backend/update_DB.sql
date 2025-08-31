-- Add missing columns for server browser functionality

-- Add is_public column to servers table
ALTER TABLE `servers` ADD COLUMN `is_public` BOOLEAN DEFAULT TRUE;

-- Update existing servers to be public
UPDATE `servers` SET `is_public` = TRUE WHERE `is_public` IS NULL;

-- Add missing columns to members table
ALTER TABLE `members` ADD COLUMN `member_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY FIRST;
ALTER TABLE `members` ADD COLUMN `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Update existing members with default joined_at
UPDATE `members` SET `joined_at` = CURRENT_TIMESTAMP WHERE `joined_at` IS NULL;

-- Add some sample public servers for testing
INSERT INTO `servers` (`server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES ('Gaming Community Hub', 1, 'https://via.placeholder.com/64/7289da/ffffff?text=G', 'A vibrant community for gamers of all types. Join us for discussions, tournaments, and fun!', TRUE);

INSERT INTO `servers` (`server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES ('Tech Developers', 1, 'https://via.placeholder.com/64/43b581/ffffff?text=T', 'Connect with fellow developers, share knowledge, and collaborate on exciting projects.', TRUE);

INSERT INTO `servers` (`server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES ('Music Producers', 1, 'https://via.placeholder.com/64/faa61a/ffffff?text=M', 'A space for music producers to share their work, get feedback, and collaborate.', TRUE);

INSERT INTO `servers` (`server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES ('Art & Design', 1, 'https://via.placeholder.com/64/ed4245/ffffff?text=A', 'Showcase your artwork, get inspired by others, and participate in creative challenges.', TRUE);

-- Add current user (user_id = 1) as a member of existing servers
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 1, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 2, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 3, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 4, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 5, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 6, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 7, 'active');
