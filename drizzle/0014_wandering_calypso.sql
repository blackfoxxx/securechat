CREATE TABLE `call_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`callType` enum('video','audio') NOT NULL DEFAULT 'video',
	`initiatedBy` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`duration` int,
	`roomName` varchar(255) NOT NULL,
	`status` enum('ongoing','completed','missed','failed') NOT NULL DEFAULT 'ongoing',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `call_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `call_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`callId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	`duration` int,
	CONSTRAINT `call_participants_id` PRIMARY KEY(`id`)
);
