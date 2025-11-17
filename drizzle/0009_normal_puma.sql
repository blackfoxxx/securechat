ALTER TABLE `conversation_members` ADD `isArchived` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `wallpaper` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `isStarred` int DEFAULT 0 NOT NULL;