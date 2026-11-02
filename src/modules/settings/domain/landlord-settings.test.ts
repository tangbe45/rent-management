import {
  InvalidLandlordSettingsError,
  LandlordSettings,
  type LandlordSettingsData,
  type ReceiptSigningMode,
} from './landlord-settings';

function data(overrides: Partial<LandlordSettingsData> = {}): LandlordSettingsData {
  return {
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
    ...overrides,
  };
}

describe('LandlordSettings.defaults', () => {
  it('exposes the singleton ID with all contact and asset fields empty', () => {
    const defaults = LandlordSettings.defaults();
    expect(defaults.value).toEqual(data());
  });
});

describe('LandlordSettings.withContact', () => {
  it('normalizes, trims and saves the contact details with the given timestamp', () => {
    const next = LandlordSettings.defaults().withContact(
      {
        landlordPhone: '  +237 600 000 000  ',
        landlordEmail: '  Landlord@Example.COM  ',
        landlordAddress: '  Yaoundé  ',
      },
      42,
    );
    expect(next.value.landlordPhone).toBe('+237 600 000 000');
    expect(next.value.landlordEmail).toBe('landlord@example.com');
    expect(next.value.landlordAddress).toBe('Yaoundé');
    expect(next.value.updatedAt).toBe(42);
  });

  it('clears blank contact fields to null', () => {
    const next = LandlordSettings.defaults()
      .withContact({ landlordPhone: '+237 600 000 000', landlordEmail: 'a@b.com', landlordAddress: 'Yaoundé' }, 1)
      .withContact({ landlordPhone: '   ', landlordEmail: '', landlordAddress: undefined }, 2);
    expect(next.value.landlordPhone).toBeNull();
    expect(next.value.landlordEmail).toBeNull();
    expect(next.value.landlordAddress).toBeNull();
  });

  it('rejects an over-length phone with a tooLong error', () => {
    expect(() =>
      LandlordSettings.defaults().withContact({ landlordPhone: '1'.repeat(31) }, 1),
    ).toThrow(new InvalidLandlordSettingsError('tooLong'));
  });

  it('rejects an over-length email with a tooLong error', () => {
    expect(() =>
      LandlordSettings.defaults().withContact({ landlordEmail: `${'a'.repeat(120)}@b.com` }, 1),
    ).toThrow(new InvalidLandlordSettingsError('tooLong'));
  });

  it('rejects an over-length address with a tooLong error', () => {
    expect(() =>
      LandlordSettings.defaults().withContact({ landlordAddress: 'a'.repeat(201) }, 1),
    ).toThrow(new InvalidLandlordSettingsError('tooLong'));
  });

  it('rejects a malformed or too-short phone with a phone error', () => {
    expect(() => LandlordSettings.defaults().withContact({ landlordPhone: 'abc' }, 1)).toThrow(
      new InvalidLandlordSettingsError('phone'),
    );
    expect(() => LandlordSettings.defaults().withContact({ landlordPhone: '12345' }, 1)).toThrow(
      new InvalidLandlordSettingsError('phone'),
    );
  });

  it('rejects a malformed email with an email error', () => {
    expect(() => LandlordSettings.defaults().withContact({ landlordEmail: 'no-at-sign' }, 1)).toThrow(
      new InvalidLandlordSettingsError('email'),
    );
  });

  it('preserves assets and existing signing modes when they are not provided', () => {
    const withAssets = LandlordSettings.defaults()
      .withAsset('signature', 'signature-1.png', 1)
      .withAsset('stamp', 'stamp-1.png', 2);
    const next = withAssets.withContact({ landlordPhone: '+237 600 000 000' }, 3);
    expect(next.value.logoFileName).toBeNull();
    expect(next.value.signatureFileName).toBe('signature-1.png');
    expect(next.value.stampFileName).toBe('stamp-1.png');
    expect(next.value.signatureMode).toBe('SAVED');
    expect(next.value.stampMode).toBe('SAVED');
  });

  it('applies provided signing modes', () => {
    const next = LandlordSettings.defaults().withContact(
      { signatureMode: 'SAVED', stampMode: 'MANUAL' },
      1,
    );
    expect(next.value.signatureMode).toBe('SAVED');
    expect(next.value.stampMode).toBe('MANUAL');
  });
});

describe('LandlordSettings.withSigningMode', () => {
  it('changes only the intended signing kind', () => {
    const next = LandlordSettings.defaults().withSigningMode('signature', 'SAVED', 7);
    expect(next.value.signatureMode).toBe('SAVED');
    expect(next.value.stampMode).toBe('MANUAL');

    const stamp = next.withSigningMode('stamp', 'MANUAL', 8);
    expect(stamp.value.signatureMode).toBe('SAVED');
    expect(stamp.value.stampMode).toBe('MANUAL');
  });

  it('rejects an unknown mode with the kind as the error identifier', () => {
    expect(() =>
      LandlordSettings.defaults().withSigningMode('signature', 'WEIRD' as ReceiptSigningMode, 1),
    ).toThrow(new InvalidLandlordSettingsError('signature'));
  });
});

describe('LandlordSettings.withAsset', () => {
  it('records a logo file name without touching signing modes', () => {
    const next = LandlordSettings.defaults().withAsset('logo', 'logo-1.png', 5);
    expect(next.value.logoFileName).toBe('logo-1.png');
    expect(next.value.signatureMode).toBe('MANUAL');
    expect(next.value.stampMode).toBe('MANUAL');
  });

  it('records a signature file name and enables SAVED mode', () => {
    const next = LandlordSettings.defaults().withAsset('signature', 'signature-1.png', 5);
    expect(next.value.signatureFileName).toBe('signature-1.png');
    expect(next.value.signatureMode).toBe('SAVED');
    expect(next.value.stampMode).toBe('MANUAL');
  });

  it('records a stamp file name and enables SAVED mode', () => {
    const next = LandlordSettings.defaults().withAsset('stamp', 'stamp-1.png', 5);
    expect(next.value.stampFileName).toBe('stamp-1.png');
    expect(next.value.stampMode).toBe('SAVED');
    expect(next.value.signatureMode).toBe('MANUAL');
  });

  it('rejects an invalid file name with a fileName error', () => {
    expect(() => LandlordSettings.defaults().withAsset('logo', '', 1)).toThrow(
      new InvalidLandlordSettingsError('fileName'),
    );
    expect(() => LandlordSettings.defaults().withAsset('logo', 'bad name.png', 1)).toThrow(
      new InvalidLandlordSettingsError('fileName'),
    );
    expect(() => LandlordSettings.defaults().withAsset('logo', 'path/slash.png', 1)).toThrow(
      new InvalidLandlordSettingsError('fileName'),
    );
  });
});

describe('LandlordSettings.removeAsset', () => {
  it('clears a logo without changing signing modes', () => {
    const next = LandlordSettings.defaults()
      .withAsset('logo', 'logo-1.png', 1)
      .removeAsset('logo', 2);
    expect(next.value.logoFileName).toBeNull();
    expect(next.value.signatureMode).toBe('MANUAL');
  });

  it('clears a signature and resets its mode to MANUAL', () => {
    const next = LandlordSettings.defaults()
      .withAsset('signature', 'signature-1.png', 1)
      .removeAsset('signature', 2);
    expect(next.value.signatureFileName).toBeNull();
    expect(next.value.signatureMode).toBe('MANUAL');
  });

  it('clears a stamp and resets its mode to MANUAL', () => {
    const next = LandlordSettings.defaults().withAsset('stamp', 'stamp-1.png', 1).removeAsset('stamp', 2);
    expect(next.value.stampFileName).toBeNull();
    expect(next.value.stampMode).toBe('MANUAL');
  });
});

describe('LandlordSettings.hydrate', () => {
  it('round-trips a valid persisted row', () => {
    const source = LandlordSettings.defaults()
      .withContact({ landlordPhone: '+237 600 000 000', landlordEmail: 'a@b.com', landlordAddress: 'Yaoundé' }, 3)
      .withAsset('stamp', 'stamp-1.png', 4);
    const hydrated = LandlordSettings.hydrate(source.value);
    expect(hydrated.value).toEqual(source.value);
  });

  it('rejects a non-singleton ID', () => {
    expect(() => LandlordSettings.hydrate(data({ id: 2 }))).toThrow(
      new InvalidLandlordSettingsError('id'),
    );
  });

  it('rejects an invalid signature mode', () => {
    expect(() =>
      LandlordSettings.hydrate(data({ signatureMode: 'WEIRD' as ReceiptSigningMode })),
    ).toThrow(new InvalidLandlordSettingsError('signatureMode'));
  });

  it('rejects an invalid stamp mode', () => {
    expect(() =>
      LandlordSettings.hydrate(data({ stampMode: 'WEIRD' as ReceiptSigningMode })),
    ).toThrow(new InvalidLandlordSettingsError('stampMode'));
  });

  it('rejects an invalid persisted file name', () => {
    expect(() => LandlordSettings.hydrate(data({ logoFileName: 'bad name' }))).toThrow(
      new InvalidLandlordSettingsError('fileName'),
    );
    expect(() => LandlordSettings.hydrate(data({ signatureFileName: 'bad/name' }))).toThrow(
      new InvalidLandlordSettingsError('fileName'),
    );
    expect(() => LandlordSettings.hydrate(data({ stampFileName: '' }))).toThrow(
      new InvalidLandlordSettingsError('fileName'),
    );
  });
});

describe('LandlordSettings immutability and accessors', () => {
  it('returns a defensive copy from value', () => {
    const source = LandlordSettings.defaults().withContact({ landlordPhone: '+237 600 000 000' }, 1);
    const exposed = source.value;
    exposed.landlordPhone = '+999';
    expect(source.value.landlordPhone).toBe('+237 600 000 000');
  });

  it('never mutates the instance it is called on', () => {
    const source = LandlordSettings.defaults();
    source.withContact({ landlordPhone: '+237 600 000 000' }, 1);
    source.withAsset('logo', 'logo-1.png', 2);
    source.removeAsset('logo', 3);
    expect(source.value.landlordPhone).toBeNull();
    expect(source.value.logoFileName).toBeNull();
  });

  it('maps each asset kind to its stored file name', () => {
    const configured = LandlordSettings.defaults()
      .withAsset('logo', 'logo-1.png', 1)
      .withAsset('signature', 'signature-1.png', 1)
      .withAsset('stamp', 'stamp-1.png', 1);
    expect(configured.fileNameFor('logo')).toBe('logo-1.png');
    expect(configured.fileNameFor('signature')).toBe('signature-1.png');
    expect(configured.fileNameFor('stamp')).toBe('stamp-1.png');
    expect(LandlordSettings.defaults().fileNameFor('signature')).toBeNull();
  });
});