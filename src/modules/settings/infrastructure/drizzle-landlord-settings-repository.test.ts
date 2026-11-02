import { LandlordSettings } from '../domain/landlord-settings';
import {
  toLandlordSettingsData,
  toLandlordSettingsRow,
  type LandlordSettingsRow,
} from './drizzle-landlord-settings-repository';

describe('drizzle landlord settings row mapping', () => {
  it('maps a fully configured settings value to its row columns', () => {
    const settings = LandlordSettings.defaults()
      .withContact(
        {
          landlordPhone: '+237 600 000 000',
          landlordEmail: 'landlord@example.com',
          landlordAddress: 'Yaoundé',
        },
        10,
      )
      .withAsset('logo', 'logo-1.png', 10)
      .withAsset('signature', 'signature-1.png', 10)
      .withAsset('stamp', 'stamp-1.png', 11);

    const row: LandlordSettingsRow = toLandlordSettingsRow(settings);

    expect(row).toEqual({
      id: 1,
      landlordPhone: '+237 600 000 000',
      landlordEmail: 'landlord@example.com',
      landlordAddress: 'Yaoundé',
      logoFileName: 'logo-1.png',
      signatureFileName: 'signature-1.png',
      signatureMode: 'SAVED',
      stampFileName: 'stamp-1.png',
      stampMode: 'SAVED',
      updatedAt: 11,
    });
  });

  it('maps domain defaults to a row with empty optional columns and MANUAL modes', () => {
    const row: LandlordSettingsRow = toLandlordSettingsRow(LandlordSettings.defaults());

    expect(row).toEqual({
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

  it('round-trips a row back through domain hydration preserving every field', () => {
    const settings = LandlordSettings.defaults()
      .withContact({ landlordPhone: '+237 600 000 000', landlordEmail: 'a@b.com', landlordAddress: 'Douala' }, 20)
      .withAsset('stamp', 'stamp-1.png', 21);

    const restored = LandlordSettings.hydrate(toLandlordSettingsData(toLandlordSettingsRow(settings)));

    expect(restored.value).toEqual(settings.value);
  });
});