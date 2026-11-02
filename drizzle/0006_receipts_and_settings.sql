CREATE TABLE `receipt_number_sequence` (
	`id` integer PRIMARY KEY NOT NULL,
	`value` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_number` text NOT NULL,
	`payment_id` text NOT NULL,
	`agreement_id` text NOT NULL,
	`language` text NOT NULL,
	`snapshot` text NOT NULL,
	`document_file_ref` text NOT NULL,
	`document_size` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_receipt_number_idx` ON `receipts` (`receipt_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_payment_id_idx` ON `receipts` (`payment_id`);--> statement-breakpoint
CREATE INDEX `receipts_agreement_id_idx` ON `receipts` (`agreement_id`);--> statement-breakpoint
CREATE INDEX `receipts_created_at_idx` ON `receipts` (`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`landlord_phone` text,
	`landlord_email` text,
	`landlord_address` text,
	`logo_file_name` text,
	`signature_file_name` text,
	`signature_mode` text NOT NULL,
	`stamp_file_name` text,
	`stamp_mode` text NOT NULL,
	`updated_at` integer NOT NULL
);
