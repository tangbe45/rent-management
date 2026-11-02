import { LandlordSettings } from '../domain/landlord-settings';
import type { LandlordSettingsRepository } from '../domain/landlord-settings-repository';
import { GetLandlordSettings } from './get-landlord-settings';

describe('GetLandlordSettings', () => {
  it('returns whatever the repository provides', () => {
    const settings: LandlordSettings = LandlordSettings.defaults().withContact(
      { landlordPhone: '+237 600 000 000' },
      5,
    );
    const repository = { get: jest.fn(() => settings) } as unknown as LandlordSettingsRepository;
    const useCase = new GetLandlordSettings({ settings: repository });

    expect(useCase.execute()).toBe(settings);
    expect(repository.get).toHaveBeenCalledTimes(1);
  });
});