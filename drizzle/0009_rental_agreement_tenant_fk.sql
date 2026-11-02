-- Rental Agreement — database integrity for the tenant relationship.
--
-- Adds a storage-level guarantee on top of the existing application validation:
--   * rental_agreements.tenant_id -> tenants.id (restrictive delete)
--
-- SQLite cannot add a foreign key to an existing table, so the table is rebuilt.
-- Drizzle runs every pending migration inside a single transaction, and
-- `PRAGMA foreign_keys` cannot be toggled effectively inside one; the rebuild
-- therefore relies on `PRAGMA defer_foreign_keys` (the same approach as
-- migration 0008) so enforcement happens at COMMIT and a violation rolls the
-- whole migration back. The preflight below aborts before the table is touched
-- and names the offending agreement and tenant IDs, so no row is ever deleted,
-- repaired or invented.
--
-- `RAISE(ABORT, ...)` accepts an expression from SQLite 3.47 (Expo SQLite ships
-- 3.50), which is what allows the offending IDs to be part of the error.
--
-- space_id is deliberately left without a foreign key in this migration.
PRAGMA defer_foreign_keys = ON;--> statement-breakpoint
CREATE TEMP TABLE `rental_agreements_preflight` (`check` integer NOT NULL);--> statement-breakpoint
CREATE TEMP TRIGGER `rental_agreements_preflight_orphan_tenant`
BEFORE INSERT ON `rental_agreements_preflight`
WHEN EXISTS (
	SELECT 1
	FROM `rental_agreements` AS ra
	LEFT JOIN `tenants` AS t ON t.`id` = ra.`tenant_id`
	WHERE t.`id` IS NULL
)
BEGIN
	SELECT RAISE(
		ABORT,
		'rental_agreements: tenant_id references a missing tenant (agreement -> tenant): ' || (
			SELECT group_concat(orphan.`detail`, ', ')
			FROM (
				SELECT ra.`id` || ' -> ' || ra.`tenant_id` AS `detail`
				FROM `rental_agreements` AS ra
				LEFT JOIN `tenants` AS t ON t.`id` = ra.`tenant_id`
				WHERE t.`id` IS NULL
				ORDER BY ra.`id`
			) AS orphan
		)
	);
END;--> statement-breakpoint
INSERT INTO `rental_agreements_preflight` (`check`) VALUES (1);--> statement-breakpoint
DROP TABLE `rental_agreements_preflight`;--> statement-breakpoint
CREATE TEMP TABLE `__rental_agreements_backup` AS
SELECT `id`, `tenant_id`, `space_id`, `start_date`, `end_date`, `termination_date`, `rent_amount`, `rent_frequency`, `first_rent_due_date`, `security_deposit_amount`, `notes`, `created_at`, `updated_at`
FROM `rental_agreements`;--> statement-breakpoint
DROP TABLE `rental_agreements`;--> statement-breakpoint
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
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint
INSERT INTO `rental_agreements`("id", "tenant_id", "space_id", "start_date", "end_date", "termination_date", "rent_amount", "rent_frequency", "first_rent_due_date", "security_deposit_amount", "notes", "created_at", "updated_at")
SELECT "id", "tenant_id", "space_id", "start_date", "end_date", "termination_date", "rent_amount", "rent_frequency", "first_rent_due_date", "security_deposit_amount", "notes", "created_at", "updated_at"
FROM `__rental_agreements_backup`;--> statement-breakpoint
DROP TABLE `__rental_agreements_backup`;--> statement-breakpoint
CREATE INDEX `rental_agreements_tenant_id_idx` ON `rental_agreements` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `rental_agreements_space_id_idx` ON `rental_agreements` (`space_id`);--> statement-breakpoint
CREATE INDEX `rental_agreements_start_date_idx` ON `rental_agreements` (`start_date`);--> statement-breakpoint
-- `PRAGMA foreign_key_check` after the rebuild. The pragma is read through its
-- table-valued form so the rows are consumed as a count: the Expo runner steps
-- a `run` statement only once, and a bare pragma that returns a row would leave
-- an open cursor and could be mistaken for success. A violation aborts the
-- migration instead of silently committing.
CREATE TEMP TABLE `rental_agreements_postflight` (`check` integer NOT NULL);--> statement-breakpoint
CREATE TEMP TRIGGER `rental_agreements_postflight_fk_violation`
BEFORE INSERT ON `rental_agreements_postflight`
WHEN (SELECT count(*) FROM pragma_foreign_key_check) > 0
BEGIN
	SELECT RAISE(ABORT, 'rental_agreements: foreign_key_check reported violations after the rebuild');
END;--> statement-breakpoint
INSERT INTO `rental_agreements_postflight` (`check`) VALUES (1);--> statement-breakpoint
DROP TABLE `rental_agreements_postflight`;
