export const PROPERTY_SPACE_NAME_MAX_LENGTH = 100;

/**
 * Controlled vocabulary describing the physical nature of a space. The type is
 * independent from `rentable`: a `BUILDING` or `ROOM` may or may not itself be
 * rentable, and a rentable space may still contain children.
 */
export const PROPERTY_SPACE_TYPES = [
  'BUILDING',
  'FLOOR',
  'APARTMENT',
  'STUDIO',
  'ROOM',
  'SHOP',
  'OFFICE',
  'WAREHOUSE',
  'OTHER',
] as const;

export type PropertySpaceType = (typeof PROPERTY_SPACE_TYPES)[number];

export function isPropertySpaceType(value: string): value is PropertySpaceType {
  return (PROPERTY_SPACE_TYPES as readonly string[]).includes(value);
}

export interface PropertySpaceData {
  id: string;
  propertyId: string;
  parentSpaceId: string | null;
  name: string;
  type: PropertySpaceType;
  rentable: boolean;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

function normalizeName(value: string): string {
  const name = value.trim();
  if (name.length === 0) {
    throw new InvalidPropertySpaceNameError('Property space name is required.');
  }
  if (name.length > PROPERTY_SPACE_NAME_MAX_LENGTH) {
    throw new InvalidPropertySpaceNameError(
      `Property space name must be at most ${PROPERTY_SPACE_NAME_MAX_LENGTH} characters.`,
    );
  }
  return name;
}

function normalizeType(value: string): PropertySpaceType {
  if (!isPropertySpaceType(value)) {
    throw new InvalidPropertySpaceTypeError(value);
  }
  return value;
}

/**
 * A Property Space is a physical space inside a Property, arranged as a tree.
 * It may represent a building, floor, apartment, studio, room, shop, office,
 * warehouse or another space. A space is not a "Rental Unit": a rentable space
 * is simply a space whose `rentable` role is enabled.
 *
 * Lifecycle is derived from `archivedAt` — `null` means active, a timestamp
 * means archived. There is deliberately no `status`/`isArchived` field, no
 * rental availability field, and no permanent delete. Rental availability is a
 * future Rental Agreement concern, never stored here.
 */
export class PropertySpace {
  private constructor(
    readonly id: string,
    readonly propertyId: string,
    readonly parentSpaceId: string | null,
    readonly name: string,
    readonly type: PropertySpaceType,
    readonly rentable: boolean,
    readonly createdAt: number,
    readonly updatedAt: number,
    readonly archivedAt: number | null,
  ) {}

  static create(input: {
    id: string;
    propertyId: string;
    parentSpaceId?: string | null;
    name: string;
    type: string;
    rentable: boolean;
    createdAt: number;
  }): PropertySpace {
    const parentSpaceId = input.parentSpaceId ?? null;
    if (parentSpaceId !== null && parentSpaceId === input.id) {
      throw new InvalidPropertySpaceParentError('A space cannot be its own parent.');
    }
    return new PropertySpace(
      input.id,
      input.propertyId,
      parentSpaceId,
      normalizeName(input.name),
      normalizeType(input.type),
      input.rentable,
      input.createdAt,
      input.createdAt,
      null,
    );
  }

  static hydrate(data: PropertySpaceData): PropertySpace {
    return new PropertySpace(
      data.id,
      data.propertyId,
      data.parentSpaceId,
      normalizeName(data.name),
      normalizeType(data.type),
      data.rentable,
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
   * Applies the editable, non-structural fields (name, type, rentable).
   * Identity, property, parent and lifecycle state are preserved. Moving a
   * space to another parent is a separate operation (`moveTo`).
   */
  update(input: {
    name: string;
    type: string;
    rentable: boolean;
    updatedAt: number;
  }): PropertySpace {
    return new PropertySpace(
      this.id,
      this.propertyId,
      this.parentSpaceId,
      normalizeName(input.name),
      normalizeType(input.type),
      input.rentable,
      this.createdAt,
      input.updatedAt,
      this.archivedAt,
    );
  }

  /**
   * Changes the parent of an active space. `parentSpaceId === null` makes the
   * space a root. The property relationship never changes here; same-property,
   * active-parent and cycle checks are orchestration concerns.
   */
  moveTo(parentSpaceId: string | null, updatedAt: number): PropertySpace {
    if (this.isArchived) {
      throw new PropertySpaceArchivedError(this.id);
    }
    if (parentSpaceId !== null && parentSpaceId === this.id) {
      throw new InvalidPropertySpaceParentError('A space cannot be its own parent.');
    }
    return new PropertySpace(
      this.id,
      this.propertyId,
      parentSpaceId,
      this.name,
      this.type,
      this.rentable,
      this.createdAt,
      updatedAt,
      this.archivedAt,
    );
  }

  archive(archivedAt: number): PropertySpace {
    if (this.isArchived) {
      throw new PropertySpaceArchivedError(this.id);
    }
    return new PropertySpace(
      this.id,
      this.propertyId,
      this.parentSpaceId,
      this.name,
      this.type,
      this.rentable,
      this.createdAt,
      archivedAt,
      archivedAt,
    );
  }

  restore(updatedAt: number): PropertySpace {
    if (this.isActive) {
      throw new PropertySpaceAlreadyActiveError(this.id);
    }
    return new PropertySpace(
      this.id,
      this.propertyId,
      this.parentSpaceId,
      this.name,
      this.type,
      this.rentable,
      this.createdAt,
      updatedAt,
      null,
    );
  }
}

export class InvalidPropertySpaceNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPropertySpaceNameError';
  }
}

export class InvalidPropertySpaceTypeError extends Error {
  constructor(value: string) {
    super(`Property space type "${value}" is not supported.`);
    this.name = 'InvalidPropertySpaceTypeError';
  }
}

export class InvalidPropertySpaceParentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPropertySpaceParentError';
  }
}

export class PropertySpaceArchivedError extends Error {
  constructor(id: string) {
    super(`Property space "${id}" is archived.`);
    this.name = 'PropertySpaceArchivedError';
  }
}

export class PropertySpaceAlreadyActiveError extends Error {
  constructor(id: string) {
    super(`Property space "${id}" is already active.`);
    this.name = 'PropertySpaceAlreadyActiveError';
  }
}