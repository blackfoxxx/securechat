ALTER TABLE `messages` ADD `encryptedContent` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `iv` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `encryptedKey` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `senderKeyFingerprint` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `publicKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `encryptedPrivateKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `keySalt` text;