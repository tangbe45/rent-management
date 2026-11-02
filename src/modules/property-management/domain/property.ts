export const PROPERTY_NAME_MAX_LENGTH = 100;
export const PROPERTY_ADDRESS_MAX_LENGTH = 200;

export interface PropertyData {
  id: string;
  name: string;
  address: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

function normalizeName(value: string): string {
  const name = value.trim();
  if (name.length === 0) {
    throw new InvalidPropertyNameError('Property name is required.');
  }
  if (name.length > PROPERTY_NAME_MAX_LENGTH) {
    throw new InvalidPropertyNameError(
      `Property name must be at most ${PROPERTY_NAME_MAX_LENGTH} characters.`,
    );
  }
  return name;
}

function normalizeAddress(value: string): string {
  const address = value.trim();
  if (address.length === 0) {
    throw new InvalidPropertyAddressError('Property address is required.');
  }
  if (address.length > PROPERTY_ADDRESS_MAX_LENGTH) {
    throw new InvalidPropertyAddressError(
      `Property address must be at most ${PROPERTY_ADDRESS_MAX_LENGTH} characters.`,
    );
  }
  return address;
}

function normalizeDescription(value: string | null | undefined): string | null {
  const description = (value ?? '').trim();
  return description.length === 0 ? null : description;
}

/**
 * A Property is the overall physical property the landlord manages (e.g. a
 * building or an estate). It is not a rentable area — apartments, rooms, shops
 * and offices belong to the future Property Space slice. Lifecycle state is
 * derived from `archivedAt`: `null` means active, a timestamp means archived.
 * There is deliberately no `status`/`isArchived` field and no permanent delete.
 */
export class Property {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly address: string,
    readonly description: string | null,
    readonly createdAt: number,
    readonly updatedAt: number,
    readonly archivedAt: number | null,
  ) {}

  static create(input: {
    id: string;
    name: string;
    address: string;
    description?: string | null;
    createdAt: number;
  }): Property {
    return new Property(
      input.id,
      normalizeName(input.name),
      normalizeAddress(input.address),
      normalizeDescription(input.description),
      input.createdAt,
      input.createdAt,
      null,
    );
  }

  static hydrate(data: PropertyData): Property {
    return new Property(
      data.id,
      normalizeName(data.name),
      normalizeAddress(data.address),
      normalizeDescription(data.description),
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
   * current lifecycle state. Editing never archives or restores a property.
   */
  update(input: {
    name: string;
    address: string;
    description?: string | null;
    updatedAt: number;
  }): Property {
    return new Property(
      this.id,
      normalizeName(input.name),
      normalizeAddress(input.address),
      normalizeDescription(input.description),
      this.createdAt,
      input.updatedAt,
      this.archivedAt,
    );
  }

  archive(archivedAt: number): Property {
    if (this.isArchived) {
      throw new PropertyAlreadyArchivedError(this.id);
    }
    return new Property(
      this.id,
      this.name,
      this.address,
      this.description,
      this.createdAt,
      archivedAt,
      archivedAt,
    );
  }

  restore(updatedAt: number): Property {
    if (this.isActive) {
      throw new PropertyAlreadyActiveError(this.id);
    }
    return new Property(
      this.id,
      this.name,
      this.address,
      this.description,
      this.createdAt,
      updatedAt,
      null,
    );
  }
}

export class InvalidPropertyNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPropertyNameError';
  }
}

export class InvalidPropertyAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPropertyAddressError';
  }
}

export class PropertyAlreadyArchivedError extends Error {
  constructor(id: string) {
    super(`Property "${id}" is already archived.`);
    this.name = 'PropertyAlreadyArchivedError';
  }
}

export class PropertyAlreadyActiveError extends Error {
  constructor(id: string) {
    super(`Property "${id}" is already active.`);
    this.name = 'PropertyAlreadyActiveError';
  }
}