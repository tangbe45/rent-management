CREATE TABLE `property_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`parent_space_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`rentable` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE INDEX `property_spaces_property_id_idx` ON `property_spaces` (`property_id`);--> statement-breakpoint
CREATE INDEX `property_spaces_parent_space_id_idx` ON `property_spaces` (`parent_space_id`);--> statement-breakpoint
CREATE INDEX `property_spaces_archived_at_idx` ON `property_spaces` (`archived_at`);