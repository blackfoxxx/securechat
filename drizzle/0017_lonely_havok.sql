ALTER TABLE `users` ADD `twoFactorEnabled` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `twoFactorSecret` text;