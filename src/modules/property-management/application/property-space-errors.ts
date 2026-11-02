export class PropertySpaceNotFoundError extends Error {
  constructor(id: string) {
    super(`Property space "${id}" was not found.`);
    this.name = 'PropertySpaceNotFoundError';
  }
}

export class PropertySpaceNameAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Another active property space named "${name}" already exists here.`);
    this.name = 'PropertySpaceNameAlreadyExistsError';
  }
}

export class PropertySpaceCycleError extends Error {
  constructor(id: string) {
    super(`Moving property space "${id}" would create a cycle in the hierarchy.`);
    this.name = 'PropertySpaceCycleError';
  }
}

export class PropertySpaceParentArchivedError extends Error {
  constructor(parentId: string) {
    super(`Parent property space "${parentId}" is archived.`);
    this.name = 'PropertySpaceParentArchivedError';
  }
}

export class PropertySpaceParentMismatchError extends Error {
  constructor(parentId: string, propertyId: string) {
    super(`Property space "${parentId}" does not belong to property "${propertyId}".`);
    this.name = 'PropertySpaceParentMismatchError';
  }
}

export class PropertySpaceCannotArchiveError extends Error {
  constructor(id: string) {
    super(`Property space "${id}" cannot be archived because it has active rental agreements.`);
    this.name = 'PropertySpaceCannotArchiveError';
  }
}

export class PropertyArchivedError extends Error {
  constructor(propertyId: string) {
    super(`Property "${propertyId}" is archived and cannot receive or manage spaces.`);
    this.name = 'PropertyArchivedError';
  }
}