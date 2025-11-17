ALTER TABLE `messages` MODIFY COLUMN `content` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `fileName` varchar(255);--> statement-breakpoint
ALTER TABLE `messages` ADD `fileType` varchar(100);--> statement-breakpoint
ALTER TABLE `messages` ADD `fileSize` int;--> statement-breakpoint
ALTER TABLE `messages` ADD `thumbnailUrl` text;--> statement-breakpoint
ALTER TABLE `messages` DROP COLUMN `encryptedContent`;--> statement-breakpoint
ALTER TABLE `messages` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `messages` DROP COLUMN `status`;