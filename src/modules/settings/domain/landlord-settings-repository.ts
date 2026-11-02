import type { LandlordSettings } from './landlord-settings';

export interface LandlordSettingsRepository {
  get(): LandlordSettings;
  save(settings: LandlordSettings): void;
}