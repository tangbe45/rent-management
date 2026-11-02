import { DatabaseSync } from 'node:sqlite';

import {
  applyMigrations,
  BUNDLED_MIGRATION_COUNT,
  createMigratedDatabase,
  schemaSql,
} from './test-support';

const TENANT_ID = 'tenant-1';
const AGREEMENT_ID = 'agreement-1';

/** Journal index of migration 0009 and therefore the count applied before it. */
const TENANT_FK_MIGRATION_IDX = 9;
const MIGRATIONS_BEFORE_TENANT_FK = TENANT_FK_MIGRATION_IDX;

function seedTenant(db: DatabaseSync, id = TENANT_ID): void {
  db.prepare(
    `INSERT INTO tenants (id, full_name, created_at, updated_at)
     VALUES (?, ?, 1000, 1000)`,
  ).run(id, `Tenant ${id}`);
}

function seedAgreement(db: DatabaseSync, id = AGREEMENT_ID, tenantId = TENANT_ID): void {
  db.prepare(
    `INSERT INTO rental_agreements
       (id, tenant_id, space_id, start_date, end_date, termination_date, rent_amount,
        rent_frequency, first_rent_due_date, security_deposit_amount, notes, created_at, updated_at)
     VALUES (?, ?, 'space-1', '2026-01-01', '2026-12-31', NULL, 50000,
             'MONTHLY', '2026-01-01', 100000, 'Pays on time', 1000, 1000)`,
  ).run(id, tenantId);
}

function agreementRows(db: DatabaseSync): Record<string, unknown>[] {
  return db.prepare('SELECT * FROM rental_agreements ORDER BY id').all();
}

function appliedMigrations(db: DatabaseSync): { hash: string; created_at: number }[] {
  return db
    .prepare('SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at')
    .all() as { hash: string; created_at: number }[];
}

function indexNames(db: DatabaseSync, table: string): string[] {
  // `sqlite_autoindex_*` entries are the implicit primary-key indexes; the
  // migration only has to recreate the explicit ones.
  return (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND name NOT LIKE 'sqlite_autoindex%' ORDER BY name",
      )
      .all(table) as { name: string }[]
  ).map((row) => row.name);
}

function foreignKeys(db: DatabaseSync, table: string): Record<string, unknown>[] {
  return db
    .prepare(`PRAGMA foreign_key_list(${table})`)
    .all() as unknown as Record<string, unknown>[];
}

function tempSchemaObjects(db: DatabaseSync): unknown[] {
  return db.prepare('SELECT name FROM sqlite_temp_master').all();
}

describe('drizzle migration runner', () => {
  it('applies every bundled migration in one ordered run', () => {
    const db = createMigratedDatabase();

    expect(appliedMigrations(db)).toHaveLength(BUNDLED_MIGRATION_COUNT);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
    db.close();
  });

  it('does nothing when every migration is already applied', () => {
    const db = createMigratedDatabase();
    const before = appliedMigrations(db);

    applyMigrations(db);

    expect(appliedMigrations(db)).toEqual(before);
    db.close();
  });
});

describe('rental agreement tenant foreign-key migration 0009', () => {
  it('rebuilds the table with restrictive tenant foreign keys and keeps every value', () => {
    const db = createMigratedDatabase({ upTo: TENANT_FK_MIGRATION_IDX - 1 });
    seedTenant(db);
    seedAgreement(db);
    seedAgreement(db, 'agreement-2', TENANT_ID);
    const before = agreementRows(db);

    applyMigrations(db);

    expect(agreementRows(db)).toEqual(before);
    expect(foreignKeys(db, 'rental_agreements')).toEqual([
      {
        id: 0,
        seq: 0,
        table: 'tenants',
        from: 'tenant_id',
        to: 'id',
        on_update: 'NO ACTION',
        on_delete: 'RESTRICT',
        match: 'NONE',
      },
    ]);
    expect(indexNames(db, 'rental_agreements')).toEqual([
      'rental_agreements_space_id_idx',
      'rental_agreements_start_date_idx',
      'rental_agreements_tenant_id_idx',
    ]);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(tempSchemaObjects(db)).toEqual([]);
    db.close();
  });

  it('aborts before touching the table and names the orphan agreements and tenants', () => {
    const db = createMigratedDatabase({ upTo: TENANT_FK_MIGRATION_IDX - 1 });
    seedAgreement(db, 'agreement-1', 'missing-tenant-1');
    seedAgreement(db, 'agreement-2', 'missing-tenant-2');
    const before = agreementRows(db);
    const tableBefore = schemaSql(db, 'rental_agreements');

    expect(() => applyMigrations(db)).toThrow(
      /rental_agreements: tenant_id references a missing tenant \(agreement -> tenant\): agreement-1 -> missing-tenant-1, agreement-2 -> missing-tenant-2/,
    );

    expect(agreementRows(db)).toEqual(before);
    expect(schemaSql(db, 'rental_agreements')).toBe(tableBefore);
    expect(schemaSql(db, 'rental_agreements')).not.toContain('FOREIGN KEY');
    expect(indexNames(db, 'rental_agreements')).toEqual([
      'rental_agreements_space_id_idx',
      'rental_agreements_start_date_idx',
      'rental_agreements_tenant_id_idx',
    ]);
    expect(tempSchemaObjects(db)).toEqual([]);
    expect(appliedMigrations(db)).toHaveLength(MIGRATIONS_BEFORE_TENANT_FK);

    // Repairing the data lets the same migration run on the same connection.
    seedTenant(db, 'missing-tenant-1');
    seedTenant(db, 'missing-tenant-2');
    applyMigrations(db);
    expect(appliedMigrations(db)).toHaveLength(BUNDLED_MIGRATION_COUNT);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(agreementRows(db)).toEqual(before);
    db.close();
  });

  it('rolls back a completed rebuild when the postflight check still finds a violation', () => {
    const db = createMigratedDatabase({ upTo: TENANT_FK_MIGRATION_IDX - 1 });
    seedTenant(db);
    seedAgreement(db);
    const before = agreementRows(db);
    const tableBefore = schemaSql(db, 'rental_agreements');

    // Simulate a legacy row that breaks another table's foreign key. The
    // agreement preflight is clean, so this is caught by `foreign_key_check`
    // after the rebuild.
    db.exec('PRAGMA foreign_keys = OFF');
    db.prepare(
      `INSERT INTO property_spaces (id, property_id, parent_space_id, name, type, rentable, created_at, updated_at, archived_at)
       VALUES ('space-orphan', 'missing-property', NULL, 'Orphan', 'ROOM', 1, 1000, 1000, NULL)`,
    ).run();
    db.exec('PRAGMA foreign_keys = ON');

    expect(() => applyMigrations(db)).toThrow(
      /rental_agreements: foreign_key_check reported violations after the rebuild/,
    );

    expect(schemaSql(db, 'rental_agreements')).toBe(tableBefore);
    expect(schemaSql(db, 'rental_agreements')).not.toContain('FOREIGN KEY');
    expect(agreementRows(db)).toEqual(before);
    expect(tempSchemaObjects(db)).toEqual([]);
    expect(appliedMigrations(db)).toHaveLength(MIGRATIONS_BEFORE_TENANT_FK);
    db.close();
  });

  it('rolls back a completed rebuild when a later statement fails', () => {
    const db = createMigratedDatabase({ upTo: TENANT_FK_MIGRATION_IDX - 1 });
    seedTenant(db);
    seedAgreement(db);
    const before = agreementRows(db);
    const tableBefore = schemaSql(db, 'rental_agreements');

    expect(() =>
      applyMigrations(db, { failAfter: 'INSERT INTO missing_table (id) VALUES (1)' }),
    ).toThrow(/no such table: missing_table/);

    expect(schemaSql(db, 'rental_agreements')).toBe(tableBefore);
    expect(schemaSql(db, 'rental_agreements')).not.toContain('FOREIGN KEY');
    expect(agreementRows(db)).toEqual(before);
    expect(tempSchemaObjects(db)).toEqual([]);
    expect(appliedMigrations(db)).toHaveLength(MIGRATIONS_BEFORE_TENANT_FK);
    db.close();
  });
});
