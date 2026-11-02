import { DatabaseSync } from 'node:sqlite';

import type { Database } from '../../../shared/infrastructure/database/connection';
import { PropertySpaceNameAlreadyExistsError } from '../application/property-space-errors';
import { PropertySpace } from '../domain/property-space';
import migration0002 from '../../../../drizzle/0002_yummy_yellowjacket.sql';
import migration0007 from '../../../../drizzle/0007_property_space_name_uniqueness.sql';
import { DrizzlePropertySpaceRepository } from './drizzle-property-space-repository';

function execMigration(db: DatabaseSync, sql: string): void {
  for (const statement of sql.split('--> statement-breakpoint')) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      db.exec(trimmed);
    }
  }
}

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  execMigration(db, migration0002);
  execMigration(db, migration0007);
  return db;
}

function insertSpace(
  db: DatabaseSync,
  space: {
    id: string;
    propertyId: string;
    parentSpaceId: string | null;
    name: string;
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
    space.parentSpaceId,
    space.name,
    space.type ?? 'ROOM',
    (space.rentable ?? true) ? 1 : 0,
    1000,
    1000,
    space.archivedAt ?? null,
  );
}

function countSpaces(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM property_spaces').get() as {
    count: number;
  };
  return row.count;
}

describe('property space name uniqueness (SQLite partial unique indexes)', () => {
  it('migration 0007 applies cleanly over an empty database', () => {
    const db = createDatabase();
    expect(countSpaces(db)).toBe(0);
  });

  it('rejects two active root spaces with the same name in the same property', () => {
    const db = createDatabase();
    insertSpace(db, { id: 'a', propertyId: 'property-1', parentSpaceId: null, name: 'Résidence' });
    expect(() =>
      insertSpace(db, { id: 'b', propertyId: 'property-1', parentSpaceId: null, name: 'Résidence' }),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('rejects two active nested spaces with the same name under the same parent', () => {
    const db = createDatabase();
    insertSpace(db, { id: 'building', propertyId: 'property-1', parentSpaceId: null, name: 'B' });
    insertSpace(db, {
      id: 'floor-a',
      propertyId: 'property-1',
      parentSpaceId: 'building',
      name: 'Floor 1',
    });
    expect(() =>
      insertSpace(db, {
        id: 'floor-b',
        propertyId: 'property-1',
        parentSpaceId: 'building',
        name: 'Floor 1',
      }),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('allows identical names under different parents', () => {
    const db = createDatabase();
    insertSpace(db, { id: 'building', propertyId: 'property-1', parentSpaceId: null, name: 'B' });
    insertSpace(db, {
      id: 'floor-a',
      propertyId: 'property-1',
      parentSpaceId: 'building',
      name: 'Floor 1',
    });
    insertSpace(db, {
      id: 'floor-b',
      propertyId: 'property-1',
      parentSpaceId: 'building',
      name: 'Floor 2',
    });
    expect(() =>
      insertSpace(db, {
        id: 'room-a',
        propertyId: 'property-1',
        parentSpaceId: 'floor-a',
        name: 'Room 1',
      }),
    ).not.toThrow();
    expect(() =>
      insertSpace(db, {
        id: 'room-b',
        propertyId: 'property-1',
        parentSpaceId: 'floor-b',
        name: 'Room 1',
      }),
    ).not.toThrow();
  });

  it('allows identical names in different properties', () => {
    const db = createDatabase();
    insertSpace(db, { id: 'a1', propertyId: 'property-1', parentSpaceId: null, name: 'Villa' });
    expect(() =>
      insertSpace(db, { id: 'a2', propertyId: 'property-2', parentSpaceId: null, name: 'Villa' }),
    ).not.toThrow();
  });

  it('allows an archived sibling to reuse a name once archived, and while still archived', () => {
    const db = createDatabase();
    insertSpace(db, { id: 'a', propertyId: 'property-1', parentSpaceId: null, name: 'B' });
    insertSpace(db, {
      id: 'room-1',
      propertyId: 'property-1',
      parentSpaceId: 'a',
      name: 'Room 1',
    });
    db.prepare('UPDATE property_spaces SET archived_at = ? WHERE id = ?').run(2000, 'room-1');

    expect(() =>
      insertSpace(db, {
        id: 'room-2',
        propertyId: 'property-1',
        parentSpaceId: 'a',
        name: 'Room 1',
      }),
    ).not.toThrow();

    expect(() =>
      insertSpace(db, {
        id: 'room-3',
        propertyId: 'property-1',
        parentSpaceId: 'a',
        name: 'Room 1',
        archivedAt: 3000,
      }),
    ).not.toThrow();
  });

  it('rejects restoring a space whose name conflicts with an active sibling', () => {
    const db = createDatabase();
    insertSpace(db, { id: 'a', propertyId: 'property-1', parentSpaceId: null, name: 'B' });
    insertSpace(db, {
      id: 'room-1',
      propertyId: 'property-1',
      parentSpaceId: 'a',
      name: 'Room 1',
    });
    insertSpace(db, {
      id: 'room-2',
      propertyId: 'property-1',
      parentSpaceId: 'a',
      name: 'Room 1',
      archivedAt: 2000,
    });

    expect(() =>
      db.prepare('UPDATE property_spaces SET archived_at = NULL WHERE id = ?').run('room-2'),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('rejects moving a space into a sibling group whose active name already matches', () => {
    const db = createDatabase();
    insertSpace(db, { id: 'a', propertyId: 'property-1', parentSpaceId: null, name: 'B' });
    insertSpace(db, { id: 'c', propertyId: 'property-1', parentSpaceId: null, name: 'C' });
    insertSpace(db, {
      id: 'room-1',
      propertyId: 'property-1',
      parentSpaceId: 'a',
      name: 'Room 1',
    });
    insertSpace(db, {
      id: 'room-2',
      propertyId: 'property-1',
      parentSpaceId: 'c',
      name: 'Room 1',
    });

    expect(() =>
      db.prepare('UPDATE property_spaces SET parent_space_id = ? WHERE id = ?').run('a', 'room-2'),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('rejects renaming a space to a name taken by an active sibling', () => {
    const db = createDatabase();
    insertSpace(db, { id: 'a', propertyId: 'property-1', parentSpaceId: null, name: 'B' });
    insertSpace(db, {
      id: 'room-1',
      propertyId: 'property-1',
      parentSpaceId: 'a',
      name: 'Room 1',
    });
    insertSpace(db, {
      id: 'room-2',
      propertyId: 'property-1',
      parentSpaceId: 'a',
      name: 'Room 2',
    });

    expect(() =>
      db.prepare('UPDATE property_spaces SET name = ? WHERE id = ?').run('Room 1', 'room-2'),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('migration preflight fails on conflicting active records without mutating them', () => {
    const db = new DatabaseSync(':memory:');
    execMigration(db, migration0002);
    insertSpace(db, { id: 'a', propertyId: 'property-1', parentSpaceId: null, name: 'Villa' });
    insertSpace(db, { id: 'b', propertyId: 'property-1', parentSpaceId: null, name: 'Villa' });

    expect(() => execMigration(db, migration0007)).toThrow(/UNIQUE constraint failed/);

    const rows = db
      .prepare('SELECT id, property_id, name FROM property_spaces ORDER BY id')
      .all() as { id: string; property_id: string; name: string }[];
    expect(rows).toEqual([
      { id: 'a', property_id: 'property-1', name: 'Villa' },
      { id: 'b', property_id: 'property-1', name: 'Villa' },
    ]);
    expect(countSpaces(db)).toBe(2);
  });
});

function repositoryWithFailing(
  saveError?: Error,
  updateError?: Error,
): DrizzlePropertySpaceRepository {
  const db = {
    insert: () => ({
      values: () => ({
        run: () => {
          if (saveError) {
            throw saveError;
          }
        },
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          run: () => {
            if (updateError) {
              throw updateError;
            }
          },
        }),
      }),
    }),
  } as unknown as Database;
  return new DrizzlePropertySpaceRepository(db);
}

function sampleSpace(): PropertySpace {
  return PropertySpace.create({
    id: 'space-1',
    propertyId: 'property-1',
    name: 'Room 1',
    type: 'ROOM',
    rentable: true,
    createdAt: 1000,
  });
}

describe('property space repository UNIQUE error mapping', () => {
  it('maps a root sibling-name UNIQUE violation on save to PropertySpaceNameAlreadyExistsError', () => {
    const repository = repositoryWithFailing(
      new Error('UNIQUE constraint failed: property_spaces.property_id, property_spaces.name'),
    );
    expect(() => repository.save(sampleSpace())).toThrow(PropertySpaceNameAlreadyExistsError);
    expect(() => repository.save(sampleSpace())).toThrow(/Another active property space named "Room 1"/);
  });

  it('maps a parented sibling-name UNIQUE violation on update to PropertySpaceNameAlreadyExistsError', () => {
    const repository = repositoryWithFailing(
      undefined,
      new Error(
        'UNIQUE constraint failed: property_spaces.property_id, property_spaces.parent_space_id, property_spaces.name',
      ),
    );
    expect(() => repository.update(sampleSpace())).toThrow(PropertySpaceNameAlreadyExistsError);
  });

  it('rethrows a duplicate primary-key violation unchanged on save', () => {
    const pkError = new Error('UNIQUE constraint failed: property_spaces.id');
    const repository = repositoryWithFailing(pkError);
    expect(() => repository.save(sampleSpace())).toThrow(pkError);
  });

  it('rethrows a duplicate primary-key violation unchanged on update', () => {
    const pkError = new Error('UNIQUE constraint failed: property_spaces.id');
    const repository = repositoryWithFailing(undefined, pkError);
    expect(() => repository.update(sampleSpace())).toThrow(pkError);
  });

  it('does not translate unrelated SQLite errors on save or update', () => {
    const ioError = new Error('disk I/O error');
    const saveRepository = repositoryWithFailing(ioError);
    expect(() => saveRepository.save(sampleSpace())).toThrow(ioError);

    const updateRepository = repositoryWithFailing(undefined, ioError);
    expect(() => updateRepository.update(sampleSpace())).toThrow(ioError);
  });
});