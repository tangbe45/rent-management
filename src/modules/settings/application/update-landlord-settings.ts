import type { Clock } from '../../../shared/domain/clock';
import type { LandlordContactInput, LandlordSettings } from '../domain/landlord-settings';
import type { LandlordSettingsRepository } from '../domain/landlord-settings-repository';

export class UpdateLandlordSettings {
  constructor(
    private readonly deps: {
      settings: LandlordSettingsRepository;
      clock: Clock;
    },
  ) {}

  execute(input: LandlordContactInput): LandlordSettings {
    const next = this.deps.settings.get().withContact(input, this.deps.clock.now());
    this.deps.settings.save(next);
    return next;
  }
}