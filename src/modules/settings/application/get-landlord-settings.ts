import type { LandlordSettingsRepository } from '../domain/landlord-settings-repository';
import type { LandlordSettings } from '../domain/landlord-settings';

export class GetLandlordSettings {
  constructor(private readonly deps: { settings: LandlordSettingsRepository }) {}

  execute(): LandlordSettings {
    return this.deps.settings.get();
  }
}