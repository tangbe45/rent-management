import { DatabaseSync } from 'node:sqlite';

import { createMigratedDatabase } from '../../../shared/infrastructure/database/test-support';

const TENANT_ID = 'tenant-1';
const AGREEMENT_ID = 'agreement-1';

function insertTenant(db: DatabaseSync, id = TENANT_ID, fullName = 'Amina Njeri'): void {
  db.prepare(
    `INSERT INTO tenants (id, full_name, phone, created_at, updated_at)
     VALUES (?, ?, '0700 000 000', 1000, 1000)`,
  ).run(id, fullName);
}

function insertAgreement(db: DatabaseSync, id = AGREEMENT_ID, tenantId = TENANT_ID): void {
  db.prepare(
    `INSERT INTO rental_agreements
       (id, tenant_id, space_id, start_date, end_date, termination_date, rent_amount,
        rent_frequency, first_rent_due_date, security_deposit_amount, notes, created_at, updated_at)
     VALUES (?, ?, 'space-1', '2026-01-01', '2026-12-31', NULL, 50000,
             'MONTHLY', '2026-01-01', 100000, 'Pays on time', 1000, 1000)`,
  ).run(id, tenantId);
}

function tenantRow(db: DatabaseSync, id = TENANT_ID): Record<string, unknown> | undefined {
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
}

function agreementIds(db: DatabaseSync): string[] {
  return (
    db.prepare('SELECT id FROM rental_agreements ORDER BY id').all() as { id: string }[]
  ).map((row) => row.id);
}

function seededDatabase(): DatabaseSync {
  const db = createMigratedDatabase();
  insertTenant(db);
  return db;
}

describe('rental agreement tenant foreign-key integrity (real SQLite)', () => {
  it('accepts an agreement whose tenant exists', () => {
    const db = seededDatabase();

    expect(() => insertAgreement(db)).not.toThrow();
    expect(agreementIds(db)).toEqual([AGREEMENT_ID]);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    db.close();
  });

  it('rejects an agreement whose tenant does not exist and stores nothing', () => {
    const db = seededDatabase();

    expect(() => insertAgreement(db, 'agreement-2', 'missing-tenant')).toThrow(
      /FOREIGN KEY constraint failed/,
    );
    expect(agreementIds(db)).toEqual([]);
    db.close();
  });

  it('rejects moving an existing agreement to a non-existent tenant', () => {
    const db = seededDatabase();
    insertAgreement(db);

    expect(() =>
      db.prepare('UPDATE rental_agreements SET tenant_id = ? WHERE id = ?').run(
        'missing-tenant',
        AGREEMENT_ID,
      ),
    ).toThrow(/FOREIGN KEY constraint failed/);
    expect(
      db.prepare('SELECT tenant_id FROM rental_agreements WHERE id = ?').get(AGREEMENT_ID),
    ).toEqual({ tenant_id: TENANT_ID });
    db.close();
  });

  it('rejects deleting a tenant that still has agreements and keeps every row intact', () => {
    const db = seededDatabase();
    insertAgreement(db);
    insertAgreement(db, 'agreement-2');
    const tenantBefore = tenantRow(db);

    expect(() => db.prepare('DELETE FROM tenants WHERE id = ?').run(TENANT_ID)).toThrow(
      /FOREIGN KEY constraint failed/,
    );

    expect(tenantRow(db)).toEqual(tenantBefore);
    expect(agreementIds(db)).toEqual(['agreement-1', 'agreement-2']);
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    db.close();
  });

  it('does not cascade or null agreement rows when the delete is rejected', () => {
    const db = seededDatabase();
    insertAgreement(db);

    expect(() => db.prepare('DELETE FROM tenants WHERE id = ?').run(TENANT_ID)).toThrow();
    expect(db.prepare('SELECT tenant_id FROM rental_agreements').all()).toEqual([
      { tenant_id: TENANT_ID },
    ]);

    // A tenant without agreements can still be deleted: no cascade is involved.
    insertTenant(db, 'tenant-2', 'Unused tenant');
    expect(() => db.prepare('DELETE FROM tenants WHERE id = ?').run('tenant-2')).not.toThrow();
    db.close();
  });

  it('continues to allow tenant updates unrelated to the primary key', () => {
    const db = seededDatabase();
    insertAgreement(db);

    expect(() =>
      db.prepare('UPDATE tenants SET full_name = ?, phone = ? WHERE id = ?').run(
        'Amina N. Njeri',
        '0711 111 111',
        TENANT_ID,
      ),
    ).not.toThrow();

    expect(tenantRow(db)).toMatchObject({
      id: TENANT_ID,
      full_name: 'Amina N. Njeri',
      phone: '0711 111 111',
    });
    expect(agreementIds(db)).toEqual([AGREEMENT_ID]);
    db.close();
  });

  it('declares only the tenant foreign key with restrictive delete and no update action', () => {
    const db = seededDatabase();

    expect(db.prepare('PRAGMA foreign_key_list(rental_agreements)').all()).toEqual([
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
    db.close();
  });

  it('still stores an agreement when its space does not exist (space_id is not constrained yet)', () => {
    const db = seededDatabase();

    // Deliberately documents the scope of this batch: only tenant_id gained a
    // foreign key. This test must be revisited when space_id gets one.
    expect(() => insertAgreement(db)).not.toThrow();
    expect(
      db.prepare('SELECT space_id FROM rental_agreements WHERE id = ?').get(AGREEMENT_ID),
    ).toEqual({ space_id: 'space-1' });
    db.close();
  });
});
