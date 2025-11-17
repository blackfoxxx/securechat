CREATE TABLE `key_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactUserId` int NOT NULL,
	`verifiedKeyFingerprint` varchar(64) NOT NULL,
	`isVerified` int NOT NULL DEFAULT 1,
	`verifiedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `key_verifications_id` PRIMARY KEY(`id`)
);
