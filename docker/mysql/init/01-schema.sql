SET NAMES utf8mb4;

DROP TABLE IF EXISTS `attachment`;
DROP TABLE IF EXISTS `message_content`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `channels`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `members`;
DROP TABLE IF EXISTS `servers`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE IF NOT EXISTS `servers` (
  `server_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `server_name` VARCHAR(255),
  `server_description` TEXT(1024),
  `server_icon` TEXT(1024),
  `owner_id` BIGINT(64),
  `is_public` BOOLEAN DEFAULT TRUE
);

INSERT INTO `servers` (`server_id`, `server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES (1, 'CollectiveM', 1, 'https://i.gyazo.com/abe61b99e892258fd30fccb500a86579.png', 'CollectiveM is a 18+ age restricted FiveM community that was started by Badger along with some of his old buddies from his past roleplaying servers he has ran. Unfortunately, these old buddies backed out of the project as soon as it was started. Never fear though, Badger plans to build up this community and make it the most realistic roleplaying experience one can encounter within FiveM.', TRUE);
INSERT INTO `servers` (`server_id`, `server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES (2, 'Badger''s Dev Community', 1, 'https://avatars.githubusercontent.com/u/8027457', 'I started Badger''s Developer Community back in July of 2019. It''s been a thing for quite a while and I have helped many people within it to fix their problems with my scripts and/or other scripts. We are a community with multiple developers and players of FiveM, as well as other software and other games. Many of us look forward to helping each other as we believe "You help me, I help you" type of philosophy. If you ever need help, don''t be afraid to ask for it!', TRUE);
INSERT INTO `servers` (`server_id`, `server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES (3, 'FSG-Nation', 1, 'https://pbs.twimg.com/profile_images/1193274446892666880/c39OPO6z_400x400.jpg', 'The father & son duo that play games and streams together!', TRUE);
INSERT INTO `servers` (`server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES ('Gaming Community Hub', 1, 'https://via.placeholder.com/64/7289da/ffffff?text=G', 'A vibrant community for gamers of all types. Join us for discussions, tournaments, and fun!', TRUE);
INSERT INTO `servers` (`server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES ('Tech Developers', 1, 'https://via.placeholder.com/64/43b581/ffffff?text=T', 'Connect with fellow developers, share knowledge, and collaborate on exciting projects.', TRUE);
INSERT INTO `servers` (`server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES ('Music Producers', 1, 'https://via.placeholder.com/64/faa61a/ffffff?text=M', 'A space for music producers to share their work, get feedback, and collaborate.', TRUE);
INSERT INTO `servers` (`server_name`, `owner_id`, `server_icon`, `server_description`, `is_public`)
VALUES ('Art & Design', 1, 'https://via.placeholder.com/64/ed4245/ffffff?text=A', 'Showcase your artwork, get inspired by others, and participate in creative challenges.', TRUE);

CREATE TABLE IF NOT EXISTS `users` (
  `user_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `user_name` VARCHAR(255),
  `user_bio` TEXT(1024),
  `user_pic` TEXT(1024),
  `email` VARCHAR(255),
  `email_verified` BOOLEAN,
  `password` VARCHAR(256)
);

INSERT INTO `users` (`user_name`, `user_bio`, `user_pic`, `email`, `email_verified`, `password`)
VALUES ('badger', null, null, 'thewolfbadger@gmail.com', true, '$2y$15$OegX3WOx5wps82XPr79hneJRkVHYA91s2sthUPh1vV1Hn5xwVqpSi');

CREATE TABLE IF NOT EXISTS `members` (
  `member_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `member_name` VARCHAR(255),
  `user_id` BIGINT(64),
  `server_id` BIGINT(64),
  `status` VARCHAR(255),
  `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 1, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 2, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 3, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 4, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 5, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 6, 'active');
INSERT INTO `members` (`user_id`, `server_id`, `status`) VALUES (1, 7, 'active');

CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `server_id` BIGINT(64),
  `category_name` VARCHAR(255),
  `category_icon` TEXT(1024)
);

INSERT INTO `categories` (`category_id`, `server_id`, `category_name`, `category_icon`)
VALUES (1, 2, 'Information', null);

CREATE TABLE IF NOT EXISTS `channels` (
  `channel_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `category_id` BIGINT(64),
  `channel_name` VARCHAR(255)
);

INSERT INTO `channels` (`category_id`, `channel_name`) VALUES (1, 'general');
INSERT INTO `channels` (`category_id`, `channel_name`) VALUES (1, 'my computer specs');
INSERT INTO `channels` (`category_id`, `channel_name`) VALUES (1, 'school shit');
INSERT INTO `channels` (`category_id`, `channel_name`) VALUES (1, 'car parts');

CREATE TABLE IF NOT EXISTS `messages` (
  `message_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `channel_id` BIGINT(64),
  `posted_by_user_id` BIGINT(64),
  `raw_text` TEXT(1024),
  `timestamp_posted` DATETIME
);

CREATE TABLE IF NOT EXISTS `message_content` (
  `message_id` BIGINT(64),
  `mentioned_members` TEXT(1024)
);

CREATE TABLE IF NOT EXISTS `attachment` (
  `attachment_id` BIGINT(64) AUTO_INCREMENT PRIMARY KEY,
  `attachment_data` TEXT(4024),
  `message_id` BIGINT(64)
);
