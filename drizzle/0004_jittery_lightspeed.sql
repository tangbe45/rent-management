CREATE TABLE `rental_agreements` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`space_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`termination_date` text,
	`rent_amount` integer NOT NULL,
	`rent_frequency` text NOT NULL,
	`first_rent_due_date` text NOT NULL,
	`security_deposit_amount` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rental_agreements_tenant_id_idx` ON `rental_agreements` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `rental_agreements_space_id_idx` ON `rental_agreements` (`space_id`);--> statement-breakpoint
CREATE INDEX `rental_agreements_start_date_idx` ON `rental_agreements` (`start_date`);