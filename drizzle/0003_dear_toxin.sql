CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`phone` text,
	`second_phone_number` text,
	`email` text,
	`national_id_card_number` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE INDEX `tenants_full_name_idx` ON `tenants` (`full_name`);--> statement-breakpoint
CREATE INDEX `tenants_archived_at_idx` ON `tenants` (`archived_at`);