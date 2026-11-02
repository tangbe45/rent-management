import type { Clock } from '../../../shared/domain/clock';
import { InvalidLandlordSettingsError, LandlordSettings } from '../domain/landlord-settings';
import type { LandlordSettingsRepository } from '../domain/landlord-settings-repository';
import { UpdateLandlordSettings } from './update-landlord-settings';

function createHarness() {
  const settings = {
    get: jest.fn(() => LandlordSettings.defaults()),
    save: jest.fn(),
  } as unknown as LandlordSettingsRepository;
  const clock = { today: () => '2026-10-10', now: () => 42 } as Clock;
  const useCase = new UpdateLandlordSettings({ settings, clock });
  return { settings, clock, useCase };
}

describe('UpdateLandlordSettings', () => {
  it('normalizes the contact input, stamps the clock timestamp and persists the next value', () => {
    const { settings, useCase } = createHarness();

    const next = useCase.execute({
      landlordPhone: '  +237 600 000 000  ',
      landlordEmail: '  Landlord@Example.COM  ',
      landlordAddress: '  Yaoundé  ',
      signatureMode: 'SAVED',
      stampMode: 'MANUAL',
    });

    expect(next.value.landlordPhone).toBe('+237 600 000 000');
    expect(next.value.landlordEmail).toBe('landlord@example.com');
    expect(next.value.landlordAddress).toBe('Yaoundé');
    expect(next.value.updatedAt).toBe(42);
    expect(next.value.signatureMode).toBe('SAVED');
    expect(settings.save).toHaveBeenCalledWith(next);
  });

  it('clears blank contact fields and preserves unset modes', () => {
    const { settings, useCase } = createHarness();

    const starting = LandlordSettings.defaults().withContact(
      { landlordPhone: '+237 600 000 000', landlordEmail: 'a@b.com' },
      1,
    );
    jest.mocked(settings.get).mockReturnValue(starting);

    const next = useCase.execute({ landlordPhone: '   ', landlordEmail: '', landlordAddress: undefined });
    expect(next.value.landlordPhone).toBeNull();
    expect(next.value.landlordEmail).toBeNull();
    expect(next.value.landlordAddress).toBeNull();
    expect(next.value.signatureMode).toBe('MANUAL');
    expect(next.value.stampMode).toBe('MANUAL');
    expect(settings.save).toHaveBeenCalledTimes(1);
  });

  it('propagates domain validation and repository failures', () => {
    const { settings, useCase } = createHarness();
    expect(() => useCase.execute({ landlordEmail: 'nope' })).toThrow(InvalidLandlordSettingsError);

    jest.mocked(settings.get).mockReturnValue(LandlordSettings.defaults());
    jest.mocked(settings.save).mockImplementation(() => {
      throw new Error('disk I/O error');
    });
    expect(() => useCase.execute({ landlordPhone: '+237 600 000 000' })).toThrow('disk I/O error');
  });
});
