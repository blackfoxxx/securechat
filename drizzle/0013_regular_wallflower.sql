CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activityType` enum('login','logout','register','message_sent','message_deleted','file_uploaded','contact_added','contact_blocked','contact_unblocked','group_created','group_joined','group_left','profile_updated','password_changed') NOT NULL,
	`details` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
