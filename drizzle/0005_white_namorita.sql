CREATE TABLE `rent_installments` (
	`id` text PRIMARY KEY NOT NULL,
	`agreement_id` text NOT NULL,
	`due_date` text NOT NULL,
	`period_index` integer NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rent_installments_agreement_due_date_idx` ON `rent_installments` (`agreement_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `rent_installments_agreement_id_idx` ON `rent_installments` (`agreement_id`);--> statement-breakpoint
CREATE TABLE `rent_payment_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`installment_id` text NOT NULL,
	`installment_due_date` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rent_payment_allocations_payment_id_idx` ON `rent_payment_allocations` (`payment_id`);--> statement-breakpoint
CREATE INDEX `rent_payment_allocations_installment_id_idx` ON `rent_payment_allocations` (`installment_id`);--> statement-breakpoint
CREATE TABLE `rent_payment_reversals` (
	`payment_id` text PRIMARY KEY NOT NULL,
	`reason` text NOT NULL,
	`explanation` text,
	`reversed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rent_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`agreement_id` text NOT NULL,
	`amount` integer NOT NULL,
	`payment_date` text NOT NULL,
	`method` text NOT NULL,
	`reference` text,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rent_payments_agreement_id_idx` ON `rent_payments` (`agreement_id`);--> statement-breakpoint
CREATE INDEX `rent_payments_payment_date_idx` ON `rent_payments` (`payment_date`);