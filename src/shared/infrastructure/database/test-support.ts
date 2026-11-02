import { DatabaseSync } from 'node:sqlite';

import type { SQL } from 'drizzle-orm';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';

import migrationsBundle from '../../../../drizzle/migrations';

/**
 * Integration support for tests that need the real Drizzle migration runner
 * over the real bundled migrations. The production runner is
 * `drizzle-orm/expo-sqlite/migrator`; it only differs in that Expo passes its
 * own SQLite client, so the tests drive the same `SQLiteSyncDialect.migrate`
 * implementation with a `node:sqlite` connection. The result is the same
 * single-transaction execution the application performs at startup.
 */
interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface MigrationBundle {
  journal: { entries: JournalEntry[] };
  migrations: Record<string, string>;
}

interface MigrationMeta {
  sql: string[];
  folderMillis: number;
  hash: string;
  bps: boolean;
}

const bundle = migrationsBundle as unknown as MigrationBundle;

/** Number of migrations bundled with the application. */
export const BUNDLED_MIGRATION_COUNT = bundle.journal.entries.length;

const dialect = new SQLiteSyncDialect();

/**
 * Minimal adapter that lets the synchronous Drizzle dialect run against
 * `node:sqlite`. Only the two session methods the migration runner uses are
 * implemented; `values` returns positional arrays, which is the shape the
 * runner expects when it reads the last applied migration.
 */
class NodeSqliteMigrationSession {
  constructor(private readonly db: DatabaseSync) {}

  run(query: SQL): void {
    const { sql, params } = dialect.sqlToQuery(query);
    this.db.prepare(sql).run(...params);
  }

  values(query: SQL): unknown[][] {
    const { sql, params } = dialect.sqlToQuery(query);
    return this.db
      .prepare(sql)
      .all(...params)
      .map((row) => Object.values(row));
  }
}

function bundledMigrations(upTo: number): MigrationMeta[] {
  return bundle.journal.entries
    .filter((entry) => entry.idx <= upTo)
    .map((entry) => {
      const sql = bundle.migrations[`m${String(entry.idx).padStart(4, '0')}`];
      if (sql === undefined) {
        throw new Error(`Missing bundled migration for journal entry ${entry.idx}`);
      }
      return {
        sql: sql.split('--> statement-breakpoint'),
        folderMillis: entry.when,
        hash: '',
        bps: entry.breakpoints,
      };
    });
}

/**
 * Runs the real migration runner. `upTo` reproduces a database that sits at an
 * older migration; `failAfter` appends a broken statement to the migration
 * list so rollback can be observed after the rebuild has already happened.
 */
export function applyMigrations(
  db: DatabaseSync,
  options: { upTo?: number; failAfter?: string } = {},
): void {
  const upTo = options.upTo ?? BUNDLED_MIGRATION_COUNT - 1;
  const migrations = bundledMigrations(upTo);
  if (options.failAfter !== undefined) {
    const last = migrations[migrations.length - 1];
    if (last === undefined) {
      throw new Error('No migrations to append the failure to');
    }
    last.sql.push(options.failAfter);
  }

  const session = new NodeSqliteMigrationSession(db);
  // The session is structurally compatible with what the runner calls; it is
  // cast because the abstract SQLiteSession type also carries query-building
  // members the runner never touches.
  dialect.migrate(migrations, session as unknown as Parameters<typeof dialect.migrate>[1]);
}

/** Opens an in-memory SQLite database migrated exactly like the application. */
export function createMigratedDatabase(options: { upTo?: number } = {}): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  applyMigrations(db, options);
  return db;
}

/** Returns the CREATE TABLE / CREATE INDEX SQL currently stored for a name. */
export function schemaSql(db: DatabaseSync, name: string): string {
  const row = db
    .prepare('SELECT sql FROM sqlite_master WHERE name = ? AND sql IS NOT NULL')
    .get(name) as { sql: string } | undefined;
  return row?.sql ?? '';
}
