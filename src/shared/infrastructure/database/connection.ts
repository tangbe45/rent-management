import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

export const DATABASE_NAME = 'rental-manager.db';

const sqlite = openDatabaseSync(DATABASE_NAME);

export const database = drizzle(sqlite);

export type Database = typeof database;