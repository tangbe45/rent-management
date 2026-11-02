import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../../../../drizzle/migrations';
import { database } from './connection';

export async function runMigrations(): Promise<void> {
  await migrate(database, migrations);
}