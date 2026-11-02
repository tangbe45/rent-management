import { DatabaseSync } from 'node:sqlite';

import { InvalidLandlordSettingsError, LandlordSettings } from '../domain/landlord-settings';
import { toLandlordSettingsData, type LandlordSettingsRow } from './drizzle-landlord-settings-repository';
import migration0006 from '../../../../drizzle/0006_receipts_and_settings.sql';

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
  execMigration(db, migration0006);
  return db;
}

/** Mirrors the repository's upsert on id = 1. */
function upsertSettings(db: DatabaseSync, row: LandlordSettingsRow): void {
  db.prepare(
    `INSERT INTO settings (id, landlord_phone, landlord_email, landlord_address,
       logo_file_name, signature_file_name, signature_mode, stamp_file_name, stamp_mode, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       landlord_phone = excluded.landlord_phone,
       landlord_email = excluded.landlord_email,
       landlord_address = excluded.landlord_address,
       logo_file_name = excluded.logo_file_name,
       signature_file_name = excluded.signature_file_name,
       signature_mode = excluded.signature_mode,
       stamp_file_name = excluded.stamp_file_name,
       stamp_mode = excluded.stamp_mode,
       updated_at = excluded.updated_at`,
  ).run(
    row.id,
    row.landlordPhone,
    row.landlordEmail,
    row.landlordAddress,
    row.logoFileName,
    row.signatureFileName,
    row.signatureMode,
    row.stampFileName,
    row.stampMode,
    row.updatedAt,
  );
}

function readSettings(db: DatabaseSync): LandlordSettingsRow | undefined {
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as
    | {
        id: number;
        landlord_phone: string | null;
        landlord_email: string | null;
        landlord_address: string | null;
        logo_file_name: string | null;
        signature_file_name: string | null;
        signature_mode: string;
        stamp_file_name: string | null;
        stamp_mode: string;
        updated_at: number;
      }
    | undefined;
  if (row === undefined) {
    return undefined;
  }
  return {
    id: row.id,
    landlordPhone: row.landlord_phone,
    landlordEmail: row.landlord_email,
    landlordAddress: row.landlord_address,
    logoFileName: row.logo_file_name,
    signatureFileName: row.signature_file_name,
    signatureMode: row.signature_mode as LandlordSettingsRow['signatureMode'],
    stampFileName: row.stamp_file_name,
    stampMode: row.stamp_mode as LandlordSettingsRow['stampMode'],
    updatedAt: row.updated_at,
  };
}

function countSettings(db: DatabaseSync): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM settings').get() as { count: number };
  return row.count;
}

describe('landlord settings persistence contract (SQLite)', () => {
  it('migration 0006 applies cleanly and leaves no settings row', () => {
    const db = createDatabase();
    expect(countSettings(db)).toBe(0);
    expect(readSettings(db)).toBeUndefined();
  });

  it('returns the singleton defaults when no row exists', () => {
    expect(readSettings(createDatabase())).toBeUndefined();
    expect(LandlordSettings.defaults().value).toEqual({
      id: 1,
      landlordPhone: null,
      landlordEmail: null,
      landlordAddress: null,
      logoFileName: null,
      signatureFileName: null,
      signatureMode: 'MANUAL',
      stampFileName: null,
      stampMode: 'MANUAL',
      updatedAt: 0,
    });
  });

  it('saves then reads back every persisted field', () => {
    const db = createDatabase();
    const settings = LandlordSettings.defaults()
      .withContact(
        { landlordPhone: '+237 600 000 000', landlordEmail: 'landlord@example.com', landlordAddress: 'Yaoundé' },
        10,
      )
      .withAsset('logo', 'logo-1.png', 10)
      .withAsset('signature', 'signature-1.png', 10)
      .withAsset('stamp', 'stamp-1.png', 11);

    upsertSettings(db, {
      id: 1,
      landlordPhone: settings.value.landlordPhone,
      landlordEmail: settings.value.landlordEmail,
      landlordAddress: settings.value.landlordAddress,
      logoFileName: 'logo-1.png',
      signatureFileName: 'signature-1.png',
      signatureMode: settings.value.signatureMode,
      stampFileName: 'stamp-1.png',
      stampMode: settings.value.stampMode,
      updatedAt: 11,
    });

    const restored = LandlordSettings.hydrate(toLandlordSettingsData(readSettings(db)!));
    expect(restored.value).toEqual(settings.value);
  });

  it('keeps a single singleton row with ID 1 across repeated saves and last write wins', () => {
    const db = createDatabase();
    const first = LandlordSettings.defaults().withContact({ landlordPhone: '+237 600 000 000' }, 1);
    const second = first.withContact({ landlordPhone: '+237 700 000 000' }, 2);

    upsertSettings(db, { ...toRow(first), landlordPhone: first.value.landlordPhone });
    upsertSettings(db, { ...toRow(second), landlordPhone: second.value.landlordPhone });

    expect(countSettings(db)).toBe(1);
    const restored = LandlordSettings.hydrate(toLandlordSettingsData(readSettings(db)!));
    expect(restored.value.landlordPhone).toBe('+237 700 000 000');
    expect(restored.value.updatedAt).toBe(2);
  });

  it('rejects an invalid persisted signing mode on hydration', () => {
    const db = createDatabase();
    upsertSettings(db, toRow(LandlordSettings.defaults()));
    db.prepare("UPDATE settings SET signature_mode = 'WEIRD' WHERE id = 1").run();

    expect(() => LandlordSettings.hydrate(toLandlordSettingsData(readSettings(db)!))).toThrow(
      new InvalidLandlordSettingsError('signatureMode'),
    );
  });

  it('rejects an invalid persisted file name on hydration', () => {
    const db = createDatabase();
    upsertSettings(db, toRow(LandlordSettings.defaults()));
    db.prepare("UPDATE settings SET logo_file_name = 'bad name' WHERE id = 1").run();

    expect(() => LandlordSettings.hydrate(toLandlordSettingsData(readSettings(db)!))).toThrow(
      new InvalidLandlordSettingsError('fileName'),
    );
  });
});

function toRow(settings: LandlordSettings): LandlordSettingsRow {
  const value = settings.value;
  return {
    id: value.id,
    landlordPhone: value.landlordPhone,
    landlordEmail: value.landlordEmail,
    landlordAddress: value.landlordAddress,
    logoFileName: value.logoFileName,
    signatureFileName: value.signatureFileName,
    signatureMode: value.signatureMode,
    stampFileName: value.stampFileName,
    stampMode: value.stampMode,
    updatedAt: value.updatedAt,
  };
}