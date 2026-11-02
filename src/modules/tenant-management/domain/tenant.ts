export const TENANT_NAME_MAX_LENGTH = 120;
export const TENANT_PHONE_MAX_LENGTH = 30;
export const TENANT_EMAIL_MAX_LENGTH = 254;
export const TENANT_NATIONAL_ID_MAX_LENGTH = 40;
export const TENANT_NOTES_MAX_LENGTH = 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_PATTERN = /^[+()\-\s.0-9]+$/;

/**
 * Plausibility checks shared by the domain and the form so the user sees the
 * same rule before and after submitting. They are deliberately permissive for
 * offline use: a phone number may carry a country code, spaces and punctuation,
 * and an email only needs a simple `local@domain.tld` shape.
 */
export function isPlausibleTenantEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isPlausibleTenantPhone(value: string): boolean {
  const phone = value.trim();
  return PHONE_ALLOWED_PATTERN.test(phone) && /[0-9]/.test(phone);
}

export interface TenantData {
  id: string;
  fullName: string;
  phone: string | null;
  secondPhoneNumber: string | null;
  email: string | null;
  nationalIdCardNumber: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

function normalizeFullName(value: string): string {
  const fullName = value.trim();
  if (fullName.length === 0) {
    throw new InvalidTenantNameError('Tenant name is required.');
  }
  if (fullName.length > TENANT_NAME_MAX_LENGTH) {
    throw new InvalidTenantNameError(
      `Tenant name must be at most ${TENANT_NAME_MAX_LENGTH} characters.`,
    );
  }
  return fullName;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = value.trim();
  return text.length === 0 ? null : text;
}

/**
 * Resolves an editable optional field before its normalizer runs. An omitted
 * field (`undefined`) keeps the stored value so a partial update cannot erase
 * data; an explicit `null` is passed through and clears it, exactly like a
 * blank string. Non-blank strings replace the stored value.
 */
function resolveUpdatedOptional(
  incoming: string | null | undefined,
  current: string | null,
): string | null {
  return incoming === undefined ? current : incoming;
}

function normalizePhone(value: string | null | undefined): string | null {
  const phone = normalizeOptionalText(value);
  if (phone === null) {
    return null;
  }
  if (phone.length > TENANT_PHONE_MAX_LENGTH) {
    throw new InvalidTenantPhoneError(
      `Phone number must be at most ${TENANT_PHONE_MAX_LENGTH} characters.`,
    );
  }
  if (!isPlausibleTenantPhone(phone)) {
    throw new InvalidTenantPhoneError(
      'Phone number may only contain digits and the symbols + - ( ) . and spaces.',
    );
  }
  return phone;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = normalizeOptionalText(value);
  if (email === null) {
    return null;
  }
  if (email.length > TENANT_EMAIL_MAX_LENGTH) {
    throw new InvalidTenantEmailError(
      `Email address must be at most ${TENANT_EMAIL_MAX_LENGTH} characters.`,
    );
  }
  if (!isPlausibleTenantEmail(email)) {
    throw new InvalidTenantEmailError(`Email address "${email}" is not valid.`);
  }
  return email;
}

function normalizeNationalId(value: string | null | undefined): string | null {
  const nationalIdCardNumber = normalizeOptionalText(value);
  if (
    nationalIdCardNumber !== null &&
    nationalIdCardNumber.length > TENANT_NATIONAL_ID_MAX_LENGTH
  ) {
    throw new InvalidTenantNationalIdError(
      `National ID card number must be at most ${TENANT_NATIONAL_ID_MAX_LENGTH} characters.`,
    );
  }
  return nationalIdCardNumber;
}

function normalizeNotes(value: string | null | undefined): string | null {
  const notes = normalizeOptionalText(value);
  if (notes !== null && notes.length > TENANT_NOTES_MAX_LENGTH) {
    throw new InvalidTenantNotesError(`Notes must be at most ${TENANT_NOTES_MAX_LENGTH} characters.`);
  }
  return notes;
}

/**
 * A Tenant is a person who rents from the landlord. Identity is the generated
 * `id`; the same person may be stored more than once and no free-text field is
 * unique. Lifecycle is derived from `archivedAt` — `null` means active, a
 * timestamp means archived. There is deliberately no `status`/`isArchived`
 * field, no permanent delete, and no cascade into agreements, payments or
 * receipts.
 */
export class Tenant {
  private constructor(
    readonly id: string,
    readonly fullName: string,
    readonly phone: string | null,
    readonly secondPhoneNumber: string | null,
    readonly email: string | null,
    readonly nationalIdCardNumber: string | null,
    readonly notes: string | null,
    readonly createdAt: number,
    readonly updatedAt: number,
    readonly archivedAt: number | null,
  ) {}

  static create(input: {
    id: string;
    fullName: string;
    phone?: string | null;
    secondPhoneNumber?: string | null;
    email?: string | null;
    nationalIdCardNumber?: string | null;
    notes?: string | null;
    createdAt: number;
  }): Tenant {
    return new Tenant(
      input.id,
      normalizeFullName(input.fullName),
      normalizePhone(input.phone),
      normalizePhone(input.secondPhoneNumber),
      normalizeEmail(input.email),
      normalizeNationalId(input.nationalIdCardNumber),
      normalizeNotes(input.notes),
      input.createdAt,
      input.createdAt,
      null,
    );
  }

  static hydrate(data: TenantData): Tenant {
    return new Tenant(
      data.id,
      normalizeFullName(data.fullName),
      normalizePhone(data.phone),
      normalizePhone(data.secondPhoneNumber),
      normalizeEmail(data.email),
      normalizeNationalId(data.nationalIdCardNumber),
      normalizeNotes(data.notes),
      data.createdAt,
      data.updatedAt,
      data.archivedAt,
    );
  }

  get isActive(): boolean {
    return this.archivedAt === null;
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }

  /**
   * Applies the editable fields while preserving identity, `createdAt` and the
   * current lifecycle state. Editing never archives or restores a tenant.
   *
   * Optional fields follow a partial-update contract: omitting a field
   * (`undefined`) keeps its stored value, while an explicit `null`, an empty
   * string or a whitespace-only string clears it. Non-blank strings are trimmed
   * and validated by the usual field rules. `fullName` remains required.
   */
  update(input: {
    fullName: string;
    phone?: string | null;
    secondPhoneNumber?: string | null;
    email?: string | null;
    nationalIdCardNumber?: string | null;
    notes?: string | null;
    updatedAt: number;
  }): Tenant {
    return new Tenant(
      this.id,
      normalizeFullName(input.fullName),
      normalizePhone(resolveUpdatedOptional(input.phone, this.phone)),
      normalizePhone(resolveUpdatedOptional(input.secondPhoneNumber, this.secondPhoneNumber)),
      normalizeEmail(resolveUpdatedOptional(input.email, this.email)),
      normalizeNationalId(
        resolveUpdatedOptional(input.nationalIdCardNumber, this.nationalIdCardNumber),
      ),
      normalizeNotes(resolveUpdatedOptional(input.notes, this.notes)),
      this.createdAt,
      input.updatedAt,
      this.archivedAt,
    );
  }

  archive(archivedAt: number): Tenant {
    if (this.isArchived) {
      throw new TenantAlreadyArchivedError(this.id);
    }
    return new Tenant(
      this.id,
      this.fullName,
      this.phone,
      this.secondPhoneNumber,
      this.email,
      this.nationalIdCardNumber,
      this.notes,
      this.createdAt,
      archivedAt,
      archivedAt,
    );
  }

  restore(updatedAt: number): Tenant {
    if (this.isActive) {
      throw new TenantAlreadyActiveError(this.id);
    }
    return new Tenant(
      this.id,
      this.fullName,
      this.phone,
      this.secondPhoneNumber,
      this.email,
      this.nationalIdCardNumber,
      this.notes,
      this.createdAt,
      updatedAt,
      null,
    );
  }
}

export class InvalidTenantNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTenantNameError';
  }
}

export class InvalidTenantPhoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTenantPhoneError';
  }
}

export class InvalidTenantEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTenantEmailError';
  }
}

export class InvalidTenantNationalIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTenantNationalIdError';
  }
}

export class InvalidTenantNotesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTenantNotesError';
  }
}

export class TenantAlreadyArchivedError extends Error {
  constructor(id: string) {
    super(`Tenant "${id}" is already archived.`);
    this.name = 'TenantAlreadyArchivedError';
  }
}

export class TenantAlreadyActiveError extends Error {
  constructor(id: string) {
    super(`Tenant "${id}" is already active.`);
    this.name = 'TenantAlreadyActiveError';
  }
}
