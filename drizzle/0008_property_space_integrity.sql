-- Property & Space Management — database integrity.
--
-- Adds storage-level guarantees on top of the existing application validation:
--   * property_spaces.property_id  -> properties.id            (restrictive delete)
--   * (parent_space_id, property_id) -> property_spaces(id, property_id)
--     so a parent space must exist and belong to the same property, and a
--     parent that still has children can never be physically deleted.
--   * a space can never be its own parent.
--
-- Existing rows are validated before the table is rebuilt. The rebuild happens
-- inside the migration transaction, so a violation aborts and rolls back with
-- the original table and data intact. Foreign keys are deferred until commit so
-- rows can be copied in their stored order (a child may appear before its
-- parent). SQLite cannot toggle `PRAGMA foreign_keys` inside a transaction, so
-- the deferred enforcement is the safe equivalent for a table rebuild.
PRAGMA defer_foreign_keys = ON;--> statement-breakpoint
CREATE TEMP TABLE `property_spaces_preflight` (`check` integer NOT NULL);--> statement-breakpoint
CREATE TEMP TRIGGER `property_spaces_preflight_orphan_property`
BEFORE INSERT ON `property_spaces_preflight`
WHEN EXISTS (
	SELECT 1 FROM `property_spaces`
	WHERE `property_id` NOT IN (SELECT `id` FROM `properties`)
)
BEGIN
	SELECT RAISE(ABORT, 'property_spaces: property_id references a missing property');
END;--> statement-breakpoint
CREATE TEMP TRIGGER `property_spaces_preflight_missing_parent`
BEFORE INSERT ON `property_spaces_preflight`
WHEN EXISTS (
	SELECT 1 FROM `property_spaces`
	WHERE `parent_space_id` IS NOT NULL
		AND `parent_space_id` NOT IN (SELECT `id` FROM `property_spaces`)
)
BEGIN
	SELECT RAISE(ABORT, 'property_spaces: parent_space_id references a missing space');
END;--> statement-breakpoint
CREATE TEMP TRIGGER `property_spaces_preflight_cross_property_parent`
BEFORE INSERT ON `property_spaces_preflight`
WHEN EXISTS (
	SELECT 1
	FROM `property_spaces` AS child
	JOIN `property_spaces` AS parent ON parent.`id` = child.`parent_space_id`
	WHERE parent.`property_id` <> child.`property_id`
)
BEGIN
	SELECT RAISE(ABORT, 'property_spaces: parent and child belong to different properties');
END;--> statement-breakpoint
CREATE TEMP TRIGGER `property_spaces_preflight_self_parent`
BEFORE INSERT ON `property_spaces_preflight`
WHEN EXISTS (SELECT 1 FROM `property_spaces` WHERE `parent_space_id` = `id`)
BEGIN
	SELECT RAISE(ABORT, 'property_spaces: a space cannot be its own parent');
END;--> statement-breakpoint
INSERT INTO `property_spaces_preflight` (`check`) VALUES (1);--> statement-breakpoint
DROP TABLE `property_spaces_preflight`;--> statement-breakpoint
CREATE TEMP TABLE `__property_spaces_backup` AS
SELECT `id`, `property_id`, `parent_space_id`, `name`, `type`, `rentable`, `created_at`, `updated_at`, `archived_at`
FROM `property_spaces`;--> statement-breakpoint
DROP TABLE `property_spaces`;--> statement-breakpoint
CREATE TABLE `property_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`parent_space_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`rentable` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`parent_space_id`,`property_id`) REFERENCES `property_spaces`(`id`,`property_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "property_spaces_not_self_parent" CHECK("parent_space_id" IS NULL OR "parent_space_id" <> "id")
);--> statement-breakpoint
CREATE UNIQUE INDEX `property_spaces_id_property_id_unique` ON `property_spaces` (`id`,`property_id`);--> statement-breakpoint
INSERT INTO `property_spaces`("id", "property_id", "parent_space_id", "name", "type", "rentable", "created_at", "updated_at", "archived_at")
SELECT "id", "property_id", "parent_space_id", "name", "type", "rentable", "created_at", "updated_at", "archived_at"
FROM `__property_spaces_backup`;--> statement-breakpoint
DROP TABLE `__property_spaces_backup`;--> statement-breakpoint
CREATE INDEX `property_spaces_property_id_idx` ON `property_spaces` (`property_id`);--> statement-breakpoint
CREATE INDEX `property_spaces_parent_space_id_idx` ON `property_spaces` (`parent_space_id`);--> statement-breakpoint
CREATE INDEX `property_spaces_archived_at_idx` ON `property_spaces` (`archived_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `property_spaces_active_parented_name_idx` ON `property_spaces` (`property_id`,`parent_space_id`,`name`) WHERE parent_space_id IS NOT NULL AND archived_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `property_spaces_active_root_name_idx` ON `property_spaces` (`property_id`,`name`) WHERE parent_space_id IS NULL AND archived_at IS NULL;
