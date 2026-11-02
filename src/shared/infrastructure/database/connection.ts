import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

export const DATABASE_NAME = 'rental-manager.db';

const sqlite = openDatabaseSync(DATABASE_NAME);
// SQLite foreign keys are disabled by default and must be enabled per connection.
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const database = drizzle(sqlite);

export type Database = typeof database;