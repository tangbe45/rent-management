import { eq } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import { settings } from '../../../shared/infrastructure/database/schema/settings';
import type { LandlordSettingsData } from '../domain/landlord-settings';
import { LandlordSettings } from '../domain/landlord-settings';
import type { LandlordSettingsRepository } from '../domain/landlord-settings-repository';

export const SETTINGS_ID = 1;

export type LandlordSettingsRow = typeof settings.$inferSelect;

export function toLandlordSettingsData(row: LandlordSettingsRow): LandlordSettingsData {
  return {
    id: row.id,
    landlordPhone: row.landlordPhone,
    landlordEmail: row.landlordEmail,
    landlordAddress: row.landlordAddress,
    logoFileName: row.logoFileName,
    signatureFileName: row.signatureFileName,
    signatureMode: row.signatureMode as LandlordSettingsData['signatureMode'],
    stampFileName: row.stampFileName,
    stampMode: row.stampMode as LandlordSettingsData['stampMode'],
    updatedAt: row.updatedAt,
  };
}

export function toLandlordSettingsRow(settings: LandlordSettings): LandlordSettingsRow {
  const data = settings.value;
  return {
    id: data.id,
    landlordPhone: data.landlordPhone,
    landlordEmail: data.landlordEmail,
    landlordAddress: data.landlordAddress,
    logoFileName: data.logoFileName,
    signatureFileName: data.signatureFileName,
    signatureMode: data.signatureMode,
    stampFileName: data.stampFileName,
    stampMode: data.stampMode,
    updatedAt: data.updatedAt,
  };
}

/**
 * Persists the single settings row. Reads fall back to pristine defaults when
 * no row exists yet, so every receipt use case can rely on `get()`.
 */
export class DrizzleLandlordSettingsRepository implements LandlordSettingsRepository {
  constructor(private readonly db: Database) {}

  get(): LandlordSettings {
    const row = this.db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get();
    return row ? LandlordSettings.hydrate(toLandlordSettingsData(row)) : LandlordSettings.defaults();
  }

  save(value: LandlordSettings): void {
    const row = toLandlordSettingsRow(value);
    this.db
      .insert(settings)
      .values(row)
      .onConflictDoUpdate({ target: settings.id, set: row })
      .run();
  }
}