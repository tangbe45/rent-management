export type ReceiptAssetKind = 'logo' | 'signature' | 'stamp';
export type ReceiptSigningMode = 'SAVED' | 'MANUAL';

export const RECEIPT_ASSET_KINDS: readonly ReceiptAssetKind[] = ['logo', 'signature', 'stamp'];
export const RECEIPT_SIGNING_MODES: readonly ReceiptSigningMode[] = ['SAVED', 'MANUAL'];

export class InvalidLandlordSettingsError extends Error {}

const SINGLETON_ID = 1;
export const MAX_PHONE = 30;
export const MAX_EMAIL = 120;
export const MAX_ADDRESS = 200;
const PHONE_PATTERN = /^[+()\-.\s\d]{6,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FILE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export interface LandlordSettingsData {
  id: number;
  landlordPhone: string | null;
  landlordEmail: string | null;
  landlordAddress: string | null;
  logoFileName: string | null;
  signatureFileName: string | null;
  signatureMode: ReceiptSigningMode;
  stampFileName: string | null;
  stampMode: ReceiptSigningMode;
  updatedAt: number;
}

/**
 * Editable landlord-receipt context. Only the landlord's contact details and
 * receipt appearance are owned here; the display name stays on the account.
 */
export interface LandlordContactInput {
  landlordPhone?: string | null;
  landlordEmail?: string | null;
  landlordAddress?: string | null;
  signatureMode?: ReceiptSigningMode;
  stampMode?: ReceiptSigningMode;
}

function normalizeOptionalText(value: string | null | undefined, max: number): string | null {
  const trimmed = (value ?? '').trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > max) {
    throw new InvalidLandlordSettingsError('tooLong');
  }
  return trimmed;
}

function normalizePhone(value: string | null | undefined): string | null {
  const phone = normalizeOptionalText(value, MAX_PHONE);
  if (phone !== null && !PHONE_PATTERN.test(phone)) {
    throw new InvalidLandlordSettingsError('phone');
  }
  return phone;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = normalizeOptionalText(value, MAX_EMAIL)?.toLowerCase() ?? null;
  if (email !== null && !EMAIL_PATTERN.test(email)) {
    throw new InvalidLandlordSettingsError('email');
  }
  return email;
}

function assertOptionalFileName(value: string | null): void {
  if (value !== null && (!FILE_NAME_PATTERN.test(value) || value.length === 0)) {
    throw new InvalidLandlordSettingsError('fileName');
  }
}

/**
 * Immutable value object holding the single landlord's receipt settings.
 * Mutations return new instances and never edit existing settings in place.
 */
export class LandlordSettings {
  private constructor(private readonly data: LandlordSettingsData) {}

  static defaults(): LandlordSettings {
    return new LandlordSettings({
      id: SINGLETON_ID,
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
  }

  static hydrate(data: LandlordSettingsData): LandlordSettings {
    if (data.id !== SINGLETON_ID) {
      throw new InvalidLandlordSettingsError('id');
    }
    if (!RECEIPT_SIGNING_MODES.includes(data.signatureMode)) {
      throw new InvalidLandlordSettingsError('signatureMode');
    }
    if (!RECEIPT_SIGNING_MODES.includes(data.stampMode)) {
      throw new InvalidLandlordSettingsError('stampMode');
    }
    assertOptionalFileName(data.logoFileName);
    assertOptionalFileName(data.signatureFileName);
    assertOptionalFileName(data.stampFileName);
    return new LandlordSettings({ ...data });
  }

  get value(): LandlordSettingsData {
    return { ...this.data };
  }

  fileNameFor(kind: ReceiptAssetKind): string | null {
    switch (kind) {
      case 'logo':
        return this.data.logoFileName;
      case 'signature':
        return this.data.signatureFileName;
      case 'stamp':
        return this.data.stampFileName;
    }
  }

  withContact(input: LandlordContactInput, updatedAt: number): LandlordSettings {
    return new LandlordSettings({
      id: SINGLETON_ID,
      landlordPhone: normalizePhone(input.landlordPhone),
      landlordEmail: normalizeEmail(input.landlordEmail),
      landlordAddress: normalizeOptionalText(input.landlordAddress, MAX_ADDRESS),
      logoFileName: this.data.logoFileName,
      signatureFileName: this.data.signatureFileName,
      signatureMode: input.signatureMode ?? this.data.signatureMode,
      stampFileName: this.data.stampFileName,
      stampMode: input.stampMode ?? this.data.stampMode,
      updatedAt,
    });
  }

  withSigningMode(kind: Exclude<ReceiptAssetKind, 'logo'>, mode: ReceiptSigningMode, updatedAt: number): LandlordSettings {
    if (!RECEIPT_SIGNING_MODES.includes(mode)) {
      throw new InvalidLandlordSettingsError(kind);
    }
    const base = { ...this.data, updatedAt };
    return new LandlordSettings({
      ...base,
      signatureMode: kind === 'signature' ? mode : base.signatureMode,
      stampMode: kind === 'stamp' ? mode : base.stampMode,
    });
  }

  withAsset(kind: ReceiptAssetKind, fileName: string, updatedAt: number): LandlordSettings {
    assertOptionalFileName(fileName);
    const base = { ...this.data, updatedAt };
    switch (kind) {
      case 'logo':
        return new LandlordSettings({ ...base, logoFileName: fileName });
      case 'signature':
        return new LandlordSettings({ ...base, signatureFileName: fileName, signatureMode: 'SAVED' });
      case 'stamp':
        return new LandlordSettings({ ...base, stampFileName: fileName, stampMode: 'SAVED' });
    }
  }

  removeAsset(kind: ReceiptAssetKind, updatedAt: number): LandlordSettings {
    const base = { ...this.data, updatedAt };
    switch (kind) {
      case 'logo':
        return new LandlordSettings({ ...base, logoFileName: null });
      case 'signature':
        return new LandlordSettings({ ...base, signatureFileName: null, signatureMode: 'MANUAL' });
      case 'stamp':
        return new LandlordSettings({ ...base, stampFileName: null, stampMode: 'MANUAL' });
    }
  }
}