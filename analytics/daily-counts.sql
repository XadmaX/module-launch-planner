CREATE TABLE `daily_counts` (
	`day` text PRIMARY KEY NOT NULL,
	`opens` integer DEFAULT 0 NOT NULL,
	`browsers` integer DEFAULT 0 NOT NULL
);
