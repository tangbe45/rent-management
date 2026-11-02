import { DatabaseSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import type { SQLiteDatabase } from 'expo-sqlite';

import migration0003 from '../../../../drizzle/0003_dear_toxin.sql';
import { buildSearchableText } from '../../../shared/domain/search-text';
import { InMemoryTenantRepository } from '../application/test-support';
import {
  normalizeTenantQuery,
  type TenantPage,
  type TenantQuery,
  type TenantSearchCriteria,
} from '../domain/tenant-repository';
import { Tenant } from '../domain/tenant';
import {
  DrizzleTenantRepository,
  escapeLikePattern,
  tenantSearchCondition,
  toTenantData,
  toTenantRow,
  type TenantRow,
} from './drizzle-tenant-repository';

const activeRow: TenantRow = {
  id: 'tenant-1',
  fullName: 'Amina Njeri',
  phone: '0700 000 000',
  secondPhoneNumber: null,
  email: 'amina@example.com',
  nationalIdCardNumber: '000123',
  notes: null,
  createdAt: 1000,
  updatedAt: 1000,
  archivedAt: null,
};

describe('drizzle tenant row mapping', () => {
  it('round-trips an active tenant through the persisted row shape', () => {
    const tenant = Tenant.hydrate(toTenantData(activeRow));

    const row = toTenantRow(tenant);
    expect(row).toEqual(activeRow);

    const restored = Tenant.hydrate(toTenantData(row));
    expect(restored.id).toBe('tenant-1');
    expect(restored.fullName).toBe('Amina Njeri');
    expect(restored.phone).toBe('0700 000 000');
    expect(restored.email).toBe('amina@example.com');
    expect(restored.isActive).toBe(true);
  });

  it('preserves the archived lifecycle through the persisted row shape', () => {
    const archivedRow: TenantRow = { ...activeRow, archivedAt: 2000, updatedAt: 2000 };

    const tenant = Tenant.hydrate(activeRow);
    expect(tenant.isArchived).toBe(false);

    const row = toTenantRow(Tenant.hydrate(archivedRow));
    expect(row.archivedAt).toBe(2000);
    expect(Tenant.hydrate(toTenantData(row)).isArchived).toBe(true);
  });

  it('preserves null optional fields and a leading-zero national ID', () => {
    const row = toTenantRow(
      Tenant.create({
        id: 'tenant-2',
        fullName: 'Brian Otieno',
        nationalIdCardNumber: '0001',
        createdAt: 500,
      }),
    );

    expect(row.phone).toBeNull();
    expect(row.secondPhoneNumber).toBeNull();
    expect(row.email).toBeNull();
    expect(row.notes).toBeNull();
    expect(row.nationalIdCardNumber).toBe('0001');
    expect(Tenant.hydrate(toTenantData(row)).nationalIdCardNumber).toBe('0001');
  });
});

const dialect = new SQLiteSyncDialect();

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
  execMigration(db, migration0003);
  return db;
}

function tenantRow(id: string, overrides: Partial<TenantRow> = {}): TenantRow {
  return {
    id,
    fullName: `Tenant ${id}`,
    phone: null,
    secondPhoneNumber: null,
    email: null,
    nationalIdCardNumber: null,
    notes: null,
    createdAt: 1000,
    updatedAt: 1000,
    archivedAt: null,
    ...overrides,
  };
}

function insertTenant(db: DatabaseSync, row: TenantRow): void {
  db.prepare(
    `INSERT INTO tenants (id, full_name, phone, second_phone_number, email,
       national_id_card_number, notes, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.fullName,
    row.phone,
    row.secondPhoneNumber,
    row.email,
    row.nationalIdCardNumber,
    row.notes,
    row.createdAt,
    row.updatedAt,
    row.archivedAt,
  );
}

/**
 * Compiles the production search predicate with Drizzle and executes the
 * generated SQL against real SQLite, so the `ESCAPE` behaviour is proven by the
 * database engine rather than by string assertions alone.
 */
function searchIds(db: DatabaseSync, search: string): string[] {
  const condition = tenantSearchCondition(search);
  if (condition === undefined) {
    throw new Error(`Expected a search predicate for "${search}".`);
  }
  const { sql: where, params } = dialect.sqlToQuery(condition);
  const rows = db
    .prepare(`SELECT id FROM tenants WHERE ${where} ORDER BY id`)
    .all(...params) as { id: string }[];
  return rows.map((row) => row.id);
}

interface RawStatement {
  run(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  setReturnArrays(value: boolean): void;
}

/**
 * Minimal `expo-sqlite`-shaped client over Node's SQLite. Drizzle's Expo
 * session only needs `prepareSync` and the synchronous execute/read methods of
 * the returned statement, which lets the real production repository run
 * against an in-memory database in tests. Raw rows are requested as arrays
 * because that is the shape `executeForRawResultSync().getAllSync()` returns.
 */
function createExpoSqliteClient(db: DatabaseSync): SQLiteDatabase {
  return {
    prepareSync(source: string) {
      const statement = db.prepare(source) as unknown as RawStatement;
      statement.setReturnArrays(true);
      return {
        executeSync(params: unknown[] = []) {
          const result = statement.run(...params) as {
            changes: number;
            lastInsertRowid: number;
          };
          return { changes: result.changes, lastInsertRowId: result.lastInsertRowid };
        },
        executeForRawResultSync(params: unknown[] = []) {
          return { getAllSync: () => statement.all(...params) };
        },
      };
    },
  } as unknown as SQLiteDatabase;
}

function createRepository(db: DatabaseSync): DrizzleTenantRepository {
  return new DrizzleTenantRepository(drizzle(createExpoSqliteClient(db)));
}

describe('escapeLikePattern', () => {
  it('escapes the LIKE wildcards and the escape character itself', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
    expect(escapeLikePattern('\\')).toBe('\\\\');
    expect(escapeLikePattern('a\\_b%')).toBe('a\\\\\\_b\\%');
  });

  it('leaves ordinary terms untouched', () => {
    expect(escapeLikePattern('amina njeri')).toBe('amina njeri');
    expect(escapeLikePattern('')).toBe('');
  });
});

describe('tenant search predicate SQL', () => {
  it('matches the normalized search text with a single escaped LIKE expression', () => {
    const condition = tenantSearchCondition('  amina  ');
    expect(condition).toBeDefined();

    const { sql: statement, params } = dialect.sqlToQuery(condition!);

    expect(statement.split(' like ?').length - 1).toBe(1);
    expect(statement.split("escape '\\'").length - 1).toBe(1);
    expect(statement).toContain('lower(');
    expect(statement).toContain('replace(');
    expect(statement).toContain('coalesce(');
    expect(statement).not.toContain('amina');
    expect(params).toEqual(['%  amina  %']);
  });

  it('folds diacritics and case in the bound term', () => {
    const { params } = dialect.sqlToQuery(tenantSearchCondition('ÉLODIE')!);

    expect(params).toEqual(['%elodie%']);
  });

  it('returns no predicate for an empty search', () => {
    expect(tenantSearchCondition('')).toBeUndefined();
  });
});

describe('drizzle tenant search against SQLite', () => {
  it('matches a literal percent sign instead of arbitrary text', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { fullName: 'Deposit 100% paid' }));
    insertTenant(db, tenantRow('t2', { fullName: 'Deposit 1000 paid' }));
    insertTenant(db, tenantRow('t3', { fullName: 'Deposit 100 paid' }));

    expect(searchIds(db, '100%')).toEqual(['t1']);
    db.close();
  });

  it('matches a literal underscore instead of any single character', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { email: 'a_b@example.com' }));
    insertTenant(db, tenantRow('t2', { email: 'axb@example.com' }));
    insertTenant(db, tenantRow('t3', { email: 'a-b@example.com' }));

    expect(searchIds(db, 'a_b')).toEqual(['t1']);
    db.close();
  });

  it('matches a literal backslash', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { fullName: 'Block \\ A' }));
    insertTenant(db, tenantRow('t2', { fullName: 'Block A' }));

    expect(searchIds(db, '\\ A')).toEqual(['t1']);
    expect(searchIds(db, '\\')).toEqual(['t1']);
    db.close();
  });

  it('still matches ordinary terms across all four searchable fields', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { fullName: 'Amina Njeri' }));
    insertTenant(db, tenantRow('t2', { phone: '0700 111 111' }));
    insertTenant(db, tenantRow('t3', { secondPhoneNumber: '0712 999 999' }));
    insertTenant(db, tenantRow('t4', { email: 'brian@example.com' }));

    expect(searchIds(db, 'amina')).toEqual(['t1']);
    expect(searchIds(db, '0700')).toEqual(['t2']);
    expect(searchIds(db, '0712')).toEqual(['t3']);
    expect(searchIds(db, 'brian@example.com')).toEqual(['t4']);
    db.close();
  });

  it('matches accented names regardless of case and diacritics', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { fullName: 'Élodie Durand' }));
    insertTenant(db, tenantRow('t2', { fullName: 'François Côte' }));
    insertTenant(db, tenantRow('t3', { fullName: 'Amina Njeri' }));

    expect(searchIds(db, 'elodie')).toEqual(['t1']);
    expect(searchIds(db, 'élodie')).toEqual(['t1']);
    expect(searchIds(db, 'ELODIE')).toEqual(['t1']);
    expect(searchIds(db, 'francois')).toEqual(['t2']);
    expect(searchIds(db, 'FRANÇOIS')).toEqual(['t2']);
    expect(searchIds(db, 'cote')).toEqual(['t2']);
    db.close();
  });

  it('treats accented and plain forms of the same letter consistently', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { fullName: 'François Côte' }));
    insertTenant(db, tenantRow('t2', { fullName: 'Cotte Limited' }));

    expect(searchIds(db, 'ç')).toEqual(['t1', 't2']);
    expect(searchIds(db, 'Ç')).toEqual(['t1', 't2']);
    expect(searchIds(db, 'c')).toEqual(['t1', 't2']);
    expect(searchIds(db, 'cote')).toEqual(['t1']);
    db.close();
  });

  it('folds ligatures and letters without a canonical decomposition', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { fullName: 'Sœur Élise' }));
    insertTenant(db, tenantRow('t2', { fullName: 'Straße Neun' }));
    insertTenant(db, tenantRow('t3', { fullName: 'Łukasz Nowak' }));

    expect(searchIds(db, 'soeur')).toEqual(['t1']);
    expect(searchIds(db, 'strasse')).toEqual(['t2']);
    expect(searchIds(db, 'lukasz')).toEqual(['t3']);
    db.close();
  });

  it('searches accented phone and email fields without changing them', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { email: 'élodie@example.com' }));
    insertTenant(db, tenantRow('t2', { secondPhoneNumber: '0712 000 000' }));

    expect(searchIds(db, 'elodie@example.com')).toEqual(['t1']);
    expect(searchIds(db, 'ÉLODIE@EXAMPLE.COM')).toEqual(['t1']);
    expect(searchIds(db, '0712')).toEqual(['t2']);
    db.close();
  });

  it('does not match unrelated text after folding', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { fullName: 'Élodie Durand' }));
    insertTenant(db, tenantRow('t2', { fullName: 'Elod' }));
    insertTenant(db, tenantRow('t3', { fullName: 'Melody Stone' }));

    expect(searchIds(db, 'elodie')).toEqual(['t1']);
    expect(searchIds(db, 'elodis')).toEqual([]);
    expect(searchIds(db, 'zzz')).toEqual([]);
    db.close();
  });

  it('produces the same search text in SQL as in JavaScript', () => {
    const db = createDatabase();
    const samples = [
      'Élodie',
      'François Côte',
      'Sœur Élise',
      'Straße Neun',
      'Нина',
      '100% a_b \\',
      'Łukasz Nowak',
    ];
    samples.forEach((fullName, index) => {
      insertTenant(db, tenantRow(`t${index}`, { fullName }));
    });

    const { sql: statement } = dialect.sqlToQuery(tenantSearchCondition('x')!);
    const expression = statement.slice(0, statement.indexOf(' like '));

    samples.forEach((fullName, index) => {
      const row = db
        .prepare(`SELECT ${expression} AS search_text FROM tenants WHERE id = ?`)
        .get(`t${index}`) as { search_text: string };

      expect(row.search_text).toBe(buildSearchableText([fullName, null, null, null]));
    });
    db.close();
  });

  it('returns the whole lifecycle for empty and whitespace-only searches', () => {
    const db = createDatabase();
    const repository = createRepository(db);
    insertTenant(db, tenantRow('t1'));
    insertTenant(db, tenantRow('t2'));

    expect(repository.findActive(normalizeTenantQuery({ search: '' })).total).toBe(2);
    expect(repository.findActive(normalizeTenantQuery({ search: '   ' })).total).toBe(2);
    db.close();
  });

  it('keeps the original stored values after an accent-insensitive search', () => {
    const db = createDatabase();
    const repository = createRepository(db);
    insertTenant(
      db,
      tenantRow('t1', { fullName: 'Élodie Durand', email: 'élodie@example.com' }),
    );

    const page = repository.findActive(normalizeTenantQuery({ search: 'elodie' }));

    expect(page.tenants).toHaveLength(1);
    expect(page.tenants[0]?.fullName).toBe('Élodie Durand');
    expect(page.tenants[0]?.email).toBe('élodie@example.com');
    db.close();
  });

  it('pages through accent-insensitive matches without duplicates or omissions', () => {
    const db = createDatabase();
    const repository = createRepository(db);
    const matchingIds = [
      'tenant-06',
      'tenant-01',
      'tenant-07',
      'tenant-03',
      'tenant-02',
      'tenant-05',
      'tenant-04',
    ];
    for (const id of matchingIds) {
      insertTenant(db, tenantRow(id, { fullName: `Élodie ${id}`, createdAt: 1000 }));
    }
    insertTenant(db, tenantRow('tenant-99', { fullName: 'Amine', createdAt: 1000 }));

    const collected: string[] = [];
    for (let offset = 0; offset < matchingIds.length; offset += 3) {
      const page = repository.findActive(
        normalizeTenantQuery({ search: 'ELODIE', limit: 3, offset }),
      );
      expect(page.total).toBe(matchingIds.length);
      collected.push(...page.tenants.map((tenant) => tenant.id));
    }

    expect(collected).toEqual([
      'tenant-01',
      'tenant-02',
      'tenant-03',
      'tenant-04',
      'tenant-05',
      'tenant-06',
      'tenant-07',
    ]);
    expect(new Set(collected).size).toBe(collected.length);
    db.close();
  });

  it('keeps injection-shaped input inside the bound parameter', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { fullName: 'Amina Njeri' }));

    expect(searchIds(db, "%' OR '1'='1")).toEqual([]);

    const condition = tenantSearchCondition("%' OR '1'='1");
    const { sql: statement, params } = dialect.sqlToQuery(condition!);
    expect(statement).not.toContain("'1'='1");
    expect(params[0]).toBe("%\\%' or '1'='1%");
    db.close();
  });

  it('applies the existing trim normalization before searching', () => {
    const db = createDatabase();
    insertTenant(db, tenantRow('t1', { fullName: 'Deposit 100% paid' }));

    const criteria = normalizeTenantQuery({ search: '  100%  ' });
    expect(criteria.search).toBe('100%');
    expect(searchIds(db, criteria.search)).toEqual(['t1']);
    db.close();
  });
});

describe('drizzle tenant listing order against SQLite', () => {
  it('orders tied createdAt values by ascending id', () => {
    const db = createDatabase();
    const repository = createRepository(db);
    // Inserted in reverse id order so insertion/rowid order is not id order.
    insertTenant(db, tenantRow('tenant-c', { createdAt: 1000 }));
    insertTenant(db, tenantRow('tenant-a', { createdAt: 1000 }));
    insertTenant(db, tenantRow('tenant-b', { createdAt: 1000 }));

    const page = repository.findActive(normalizeTenantQuery());

    expect(page.total).toBe(3);
    expect(page.tenants.map((tenant) => tenant.id)).toEqual([
      'tenant-a',
      'tenant-b',
      'tenant-c',
    ]);
    db.close();
  });

  it('keeps createdAt as the primary ordering key', () => {
    const db = createDatabase();
    const repository = createRepository(db);
    insertTenant(db, tenantRow('tenant-c', { createdAt: 3000 }));
    insertTenant(db, tenantRow('tenant-a', { createdAt: 1000 }));
    insertTenant(db, tenantRow('tenant-b', { createdAt: 2000 }));

    const page = repository.findActive(normalizeTenantQuery());

    expect(page.tenants.map((tenant) => tenant.id)).toEqual([
      'tenant-a',
      'tenant-b',
      'tenant-c',
    ]);
    db.close();
  });

  it('pages through tied timestamps without duplicates or omissions', () => {
    const db = createDatabase();
    const repository = createRepository(db);
    // Deliberately inserted out of id order; every row ties on createdAt.
    const inserted = [
      'tenant-06',
      'tenant-01',
      'tenant-07',
      'tenant-03',
      'tenant-02',
      'tenant-05',
      'tenant-04',
    ];
    for (const id of inserted) {
      insertTenant(db, tenantRow(id, { createdAt: 1000 }));
    }

    const collected: string[] = [];
    for (let offset = 0; offset < inserted.length; offset += 3) {
      const page = repository.findActive(normalizeTenantQuery({ limit: 3, offset }));
      expect(page.total).toBe(7);
      collected.push(...page.tenants.map((tenant) => tenant.id));
    }

    expect(collected).toEqual([
      'tenant-01',
      'tenant-02',
      'tenant-03',
      'tenant-04',
      'tenant-05',
      'tenant-06',
      'tenant-07',
    ]);
    expect(new Set(collected).size).toBe(collected.length);
    db.close();
  });

  it('returns a stable order when the same page is requested twice', () => {
    const db = createDatabase();
    const repository = createRepository(db);
    for (const id of ['tenant-d', 'tenant-a', 'tenant-c', 'tenant-b']) {
      insertTenant(db, tenantRow(id, { createdAt: 1000 }));
    }

    const first = repository.findActive(normalizeTenantQuery({ limit: 2, offset: 1 }));
    const second = repository.findActive(normalizeTenantQuery({ limit: 2, offset: 1 }));

    expect(first.tenants.map((tenant) => tenant.id)).toEqual(['tenant-b', 'tenant-c']);
    expect(second.tenants.map((tenant) => tenant.id)).toEqual(['tenant-b', 'tenant-c']);
    db.close();
  });

  it('keeps tied timestamps ordered by id while searching and paging', () => {
    const db = createDatabase();
    const repository = createRepository(db);
    insertTenant(db, tenantRow('tenant-c', { fullName: 'Shared Garden', createdAt: 1000 }));
    insertTenant(db, tenantRow('tenant-a', { fullName: 'Shared Garden', createdAt: 1000 }));
    insertTenant(db, tenantRow('tenant-b', { fullName: 'Shared Garden', createdAt: 1000 }));
    insertTenant(db, tenantRow('tenant-d', { fullName: 'Other Tenant', createdAt: 1000 }));

    const first = repository.findActive(normalizeTenantQuery({ search: 'shared', limit: 2 }));
    const second = repository.findActive(
      normalizeTenantQuery({ search: 'shared', limit: 2, offset: 2 }),
    );

    expect(first.total).toBe(3);
    expect(first.tenants.map((tenant) => tenant.id)).toEqual(['tenant-a', 'tenant-b']);
    expect(second.tenants.map((tenant) => tenant.id)).toEqual(['tenant-c']);
    db.close();
  });
});

describe('tenant search parity with the in-memory repository', () => {
  const rows: TenantRow[] = [
    tenantRow('tenant-01', {
      fullName: 'Élodie Durand',
      email: 'elodie@example.com',
      createdAt: 1000,
    }),
    tenantRow('tenant-02', {
      fullName: 'François Côte',
      secondPhoneNumber: '0712 000 000',
      createdAt: 1000,
    }),
    tenantRow('tenant-03', { fullName: 'Elodie Bernard', createdAt: 2000 }),
    tenantRow('tenant-04', { fullName: 'Cotte Limited', createdAt: 2000 }),
    tenantRow('tenant-05', { fullName: 'Šimon Novák', phone: '0700 555 555', createdAt: 3000 }),
    tenantRow('tenant-06', { fullName: 'Amina Njeri', createdAt: 500, archivedAt: 5000 }),
    tenantRow('archived-01', { fullName: 'Élodie Archive', createdAt: 600, archivedAt: 6000 }),
  ];

  interface SeededRepositories {
    db: DatabaseSync;
    drizzle: DrizzleTenantRepository;
    memory: InMemoryTenantRepository;
  }

  function seed(): SeededRepositories {
    const db = createDatabase();
    const memory = new InMemoryTenantRepository();
    for (const row of rows) {
      insertTenant(db, row);
      memory.save(Tenant.hydrate(toTenantData(row)));
    }
    return { db, drizzle: createRepository(db), memory };
  }

  function activePage(
    repository: { findActive(criteria: TenantSearchCriteria): TenantPage },
    query: TenantQuery,
  ) {
    const page = repository.findActive(normalizeTenantQuery(query));
    return { total: page.total, ids: page.tenants.map((tenant) => tenant.id) };
  }

  it('returns the same matches and totals as the in-memory repository', () => {
    const repositories = seed();
    const searches = [
      '',
      '   ',
      'elodie',
      'élodie',
      'ÉLODIE',
      'francois',
      'FRANÇOIS',
      'cote',
      'ç',
      'c',
      'novak',
      'simon',
      '0712',
      'zzz',
    ];

    for (const search of searches) {
      expect(activePage(repositories.drizzle, { search })).toEqual(
        activePage(repositories.memory, { search }),
      );
    }
    repositories.db.close();
  });

  it('returns the same pages for search combined with pagination', () => {
    const repositories = seed();
    const windows = [
      { limit: 1, offset: 0 },
      { limit: 1, offset: 1 },
      { limit: 2, offset: 0 },
      { limit: 2, offset: 2 },
      { limit: 3, offset: 0 },
      { limit: 3, offset: 3 },
    ];

    for (const window of windows) {
      expect(activePage(repositories.drizzle, { search: 'elodie', ...window })).toEqual(
        activePage(repositories.memory, { search: 'elodie', ...window }),
      );
      expect(activePage(repositories.drizzle, { search: 'e', ...window })).toEqual(
        activePage(repositories.memory, { search: 'e', ...window }),
      );
    }
    repositories.db.close();
  });

  it('returns the same archived matches as the in-memory repository', () => {
    const repositories = seed();
    const criteria = normalizeTenantQuery({ search: 'ÉLODIE' });
    const fromDrizzle = repositories.drizzle.findArchived(criteria);
    const fromMemory = repositories.memory.findArchived(criteria);

    expect(fromDrizzle.total).toBe(fromMemory.total);
    expect(fromDrizzle.tenants.map((tenant) => tenant.id)).toEqual(
      fromMemory.tenants.map((tenant) => tenant.id),
    );
    repositories.db.close();
  });
});
