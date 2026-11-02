import { DatabaseSync } from 'node:sqlite';

import migration0001 from '../../../../drizzle/0001_puzzling_husk.sql';
import migration0002 from '../../../../drizzle/0002_yummy_yellowjacket.sql';
import migration0007 from '../../../../drizzle/0007_property_space_name_uniqueness.sql';
import migration0008 from '../../../../drizzle/0008_property_space_integrity.sql';

function execMigration(db: DatabaseSync, sql: string): void {
  for (const statement of sql.split('--> statement-breakpoint')) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      db.exec(trimmed);
    }
  }
}

/**
 * Legacy schema, before integrity migration 0008: property_spaces has no
 * foreign keys, so invalid rows could be stored. Foreign keys are enabled the
 * same way the application connection enables them.
 */
function createLegacyDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  execMigration(db, migration0001);
  execMigration(db, migration0002);
  execMigration(db, migration0007);
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

function runIntegrityMigration(db: DatabaseSync): void {
  // Drizzle runs a migration inside a single transaction, which is also what
  // makes the preflight/rollback behaviour observable.
  db.exec('begin');
  try {
    execMigration(db, migration0008);
    db.exec('commit');
  } catch (error) {
    db.exec('rollback');
    throw error;
  }
}

function insertProperty(db: DatabaseSync, id: string, name = id): void {
  db.prepare(
    `INSERT INTO properties (id, name, address, created_at, updated_at)
     VALUES (?, ?, 'Address', 1000, 1000)`,
  ).run(id, name);
}

function insertSpace(
  db: DatabaseSync,
  space: {
    id: string;
    propertyId: string;
    parentSpaceId?: string | null;
    name?: string;
    type?: string;
    rentable?: boolean;
    archivedAt?: number | null;
  },
): void {
  db.prepare(
    `INSERT INTO property_spaces (id, property_id, parent_space_id, name, type, rentable, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    space.id,
    space.propertyId,
    space.parentSpaceId ?? null,
    space.name ?? space.id,
    space.type ?? 'ROOM',
    (space.rentable ?? true) ? 1 : 0,
    1000,
    1000,
    space.archivedAt ?? null,
  );
}

function createMigratedDatabase(): DatabaseSync {
  const db = createLegacyDatabase();
  insertProperty(db, 'property-1');
  insertProperty(db, 'property-2');
  runIntegrityMigration(db);
  return db;
}

function spaceRows(db: DatabaseSync): { id: string; property_id: string; parent_space_id: string | null }[] {
  return db
    .prepare('SELECT id, property_id, parent_space_id FROM property_spaces ORDER BY id')
    .all() as {
    id: string;
    property_id: string;
    parent_space_id: string | null;
  }[];
}

function tableSql(db: DatabaseSync): string {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'property_spaces'")
    .get() as { sql: string } | undefined;
  return row?.sql ?? '';
}

describe('property space referential integrity (SQLite foreign keys)', () => {
  it('installs restrictive foreign keys for the property and the parent space', () => {
    const db = createMigratedDatabase();

    const foreignKeys = (
      db.prepare('PRAGMA foreign_key_list(property_spaces)').all() as unknown as {
        table: string;
        from: string;
        to: string;
        on_delete: string;
      }[]
    ).map(({ table, from, to, on_delete }) => ({ table, from, to, on_delete }));

    expect(foreignKeys).toEqual(
      expect.arrayContaining([
        { table: 'properties', from: 'property_id', to: 'id', on_delete: 'RESTRICT' },
        {
          table: 'property_spaces',
          from: 'parent_space_id',
          to: 'id',
          on_delete: 'RESTRICT',
        },
        {
          table: 'property_spaces',
          from: 'property_id',
          to: 'property_id',
          on_delete: 'RESTRICT',
        },
      ]),
    );
    expect(foreignKeys).toHaveLength(3);
    expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('installs the parent key, name uniqueness indexes and the self-parent check', () => {
    const db = createMigratedDatabase();

    const indexNames = (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'property_spaces'",
        )
        .all() as { name: string }[]
    ).map((row) => row.name);

    expect(indexNames).toEqual(
      expect.arrayContaining([
        'property_spaces_id_property_id_unique',
        'property_spaces_property_id_idx',
        'property_spaces_parent_space_id_idx',
        'property_spaces_archived_at_idx',
        'property_spaces_active_parented_name_idx',
        'property_spaces_active_root_name_idx',
      ]),
    );
    expect(tableSql(db)).toContain('property_spaces_not_self_parent');
  });

  it('copies existing rows even when a child is stored before its parent', () => {
    const db = createLegacyDatabase();
    insertProperty(db, 'property-1');
    insertSpace(db, {
      id: 'room',
      propertyId: 'property-1',
      parentSpaceId: 'building',
      name: 'Room',
    });
    insertSpace(db, { id: 'building', propertyId: 'property-1', name: 'Building', rentable: false });

    runIntegrityMigration(db);

    expect(spaceRows(db)).toEqual([
      { id: 'building', property_id: 'property-1', parent_space_id: null },
      { id: 'room', property_id: 'property-1', parent_space_id: 'building' },
    ]);
  });

  it('rejects a space whose property does not exist', () => {
    const db = createMigratedDatabase();

    expect(() =>
      insertSpace(db, { id: 'room', propertyId: 'missing-property' }),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it('rejects a space whose parent does not exist', () => {
    const db = createMigratedDatabase();

    expect(() =>
      insertSpace(db, { id: 'room', propertyId: 'property-1', parentSpaceId: 'missing' }),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it('rejects a parent space that belongs to another property', () => {
    const db = createMigratedDatabase();
    insertSpace(db, { id: 'other-root', propertyId: 'property-2', name: 'Other root' });

    expect(() =>
      insertSpace(db, {
        id: 'room',
        propertyId: 'property-1',
        parentSpaceId: 'other-root',
        name: 'Room',
      }),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it('rejects a space being its own parent on insert and update', () => {
    const db = createMigratedDatabase();
    insertSpace(db, { id: 'room', propertyId: 'property-1', name: 'Room' });

    expect(() =>
      insertSpace(db, {
        id: 'loop',
        propertyId: 'property-1',
        parentSpaceId: 'loop',
        name: 'Loop',
      }),
    ).toThrow(/CHECK constraint failed: property_spaces_not_self_parent/);

    expect(() =>
      db.prepare('UPDATE property_spaces SET parent_space_id = ? WHERE id = ?').run('room', 'room'),
    ).toThrow(/CHECK constraint failed: property_spaces_not_self_parent/);
  });

  it('rejects moving a space to another property while it has a parent there', () => {
    const db = createMigratedDatabase();
    insertSpace(db, { id: 'building', propertyId: 'property-1', name: 'Building', rentable: false });
    insertSpace(db, {
      id: 'room',
      propertyId: 'property-1',
      parentSpaceId: 'building',
      name: 'Room',
    });

    expect(() =>
      db.prepare('UPDATE property_spaces SET property_id = ? WHERE id = ?').run('property-2', 'room'),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it('rejects deleting a property that still owns spaces', () => {
    const db = createMigratedDatabase();
    insertSpace(db, { id: 'room', propertyId: 'property-1', name: 'Room' });

    expect(() => db.prepare('DELETE FROM properties WHERE id = ?').run('property-1')).toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it('rejects deleting a parent that still has children but allows deleting a leaf', () => {
    const db = createMigratedDatabase();
    insertSpace(db, { id: 'building', propertyId: 'property-1', name: 'Building', rentable: false });
    insertSpace(db, {
      id: 'room',
      propertyId: 'property-1',
      parentSpaceId: 'building',
      name: 'Room',
    });

    expect(() => db.prepare('DELETE FROM property_spaces WHERE id = ?').run('building')).toThrow(
      /FOREIGN KEY constraint failed/,
    );

    expect(() => db.prepare('DELETE FROM property_spaces WHERE id = ?').run('room')).not.toThrow();
    expect(spaceRows(db)).toEqual([
      { id: 'building', property_id: 'property-1', parent_space_id: null },
    ]);
  });

  it('keeps the partial unique name indexes active after the rebuild', () => {
    const db = createMigratedDatabase();
    insertSpace(db, { id: 'a', propertyId: 'property-1', name: 'Villa' });

    expect(() =>
      insertSpace(db, { id: 'b', propertyId: 'property-1', name: 'Villa' }),
    ).toThrow(/UNIQUE constraint failed/);

    insertSpace(db, { id: 'building', propertyId: 'property-1', name: 'Building', rentable: false });
    insertSpace(db, {
      id: 'room-1',
      propertyId: 'property-1',
      parentSpaceId: 'building',
      name: 'Room 1',
      archivedAt: 2000,
    });

    expect(() =>
      insertSpace(db, {
        id: 'room-2',
        propertyId: 'property-1',
        parentSpaceId: 'building',
        name: 'Room 1',
      }),
    ).not.toThrow();
  });
});

describe('property space integrity migration 0008', () => {
  it('rolls back and preserves legacy data when an existing space has no property', () => {
    const db = createLegacyDatabase();
    insertProperty(db, 'property-1');
    insertSpace(db, { id: 'orphan', propertyId: 'missing', name: 'Orphan' });

    expect(() => runIntegrityMigration(db)).toThrow(
      /property_spaces: property_id references a missing property/,
    );

    expect(spaceRows(db)).toEqual([
      { id: 'orphan', property_id: 'missing', parent_space_id: null },
    ]);
    expect(tableSql(db)).not.toContain('FOREIGN KEY');
    expect(db.prepare('SELECT name FROM sqlite_temp_master').all()).toEqual([]);

    // Fixing the data allows the migration to succeed on the same connection.
    db.prepare('DELETE FROM property_spaces WHERE id = ?').run('orphan');
    expect(() => runIntegrityMigration(db)).not.toThrow();
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('rolls back when an existing parent space is missing', () => {
    const db = createLegacyDatabase();
    insertProperty(db, 'property-1');
    insertSpace(db, {
      id: 'room',
      propertyId: 'property-1',
      parentSpaceId: 'missing',
      name: 'Room',
    });

    expect(() => runIntegrityMigration(db)).toThrow(
      /property_spaces: parent_space_id references a missing space/,
    );
    expect(spaceRows(db)).toEqual([
      { id: 'room', property_id: 'property-1', parent_space_id: 'missing' },
    ]);
  });

  it('rolls back when an existing parent belongs to another property', () => {
    const db = createLegacyDatabase();
    insertProperty(db, 'property-1');
    insertProperty(db, 'property-2');
    insertSpace(db, { id: 'other-root', propertyId: 'property-2', name: 'Other root' });
    insertSpace(db, {
      id: 'room',
      propertyId: 'property-1',
      parentSpaceId: 'other-root',
      name: 'Room',
    });

    expect(() => runIntegrityMigration(db)).toThrow(
      /property_spaces: parent and child belong to different properties/,
    );
    expect(spaceRows(db)).toEqual([
      { id: 'other-root', property_id: 'property-2', parent_space_id: null },
      { id: 'room', property_id: 'property-1', parent_space_id: 'other-root' },
    ]);
  });

  it('rolls back when an existing space is its own parent', () => {
    const db = createLegacyDatabase();
    insertProperty(db, 'property-1');
    insertSpace(db, { id: 'loop', propertyId: 'property-1', parentSpaceId: 'loop', name: 'Loop' });

    expect(() => runIntegrityMigration(db)).toThrow(
      /property_spaces: a space cannot be its own parent/,
    );
    expect(spaceRows(db)).toEqual([
      { id: 'loop', property_id: 'property-1', parent_space_id: 'loop' },
    ]);
  });
});
