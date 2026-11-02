export class RentalAgreementNotFoundError extends Error {
  constructor(id: string) {
    super(`Rental agreement "${id}" was not found.`);
    this.name = 'RentalAgreementNotFoundError';
  }
}

export class RentalAgreementTenantNotFoundError extends Error {
  constructor(id: string) {
    super(`Tenant "${id}" was not found and cannot receive a rental agreement.`);
    this.name = 'RentalAgreementTenantNotFoundError';
  }
}

export class RentalAgreementTenantArchivedError extends Error {
  constructor(id: string) {
    super(`Tenant "${id}" is archived and cannot receive a rental agreement.`);
    this.name = 'RentalAgreementTenantArchivedError';
  }
}

export class RentalAgreementPropertyNotFoundError extends Error {
  constructor(id: string) {
    super(`Property "${id}" was not found.`);
    this.name = 'RentalAgreementPropertyNotFoundError';
  }
}

export class RentalAgreementPropertyArchivedError extends Error {
  constructor(id: string) {
    super(`Property "${id}" is archived and cannot hold rental agreements.`);
    this.name = 'RentalAgreementPropertyArchivedError';
  }
}

export class RentalAgreementSpaceNotFoundError extends Error {
  constructor(id: string) {
    super(`Property space "${id}" was not found.`);
    this.name = 'RentalAgreementSpaceNotFoundError';
  }
}

export class RentalAgreementSpaceArchivedError extends Error {
  constructor(id: string) {
    super(`Property space "${id}" is archived and cannot be rented.`);
    this.name = 'RentalAgreementSpaceArchivedError';
  }
}

export class RentalAgreementSpaceNotRentableError extends Error {
  constructor(id: string) {
    super(`Property space "${id}" is not marked as rentable.`);
    this.name = 'RentalAgreementSpaceNotRentableError';
  }
}

export class RentalAgreementAncestorArchivedError extends Error {
  constructor(id: string) {
    super(`An ancestor space "${id}" of the selected space is archived.`);
    this.name = 'RentalAgreementAncestorArchivedError';
  }
}

export class RentalAgreementSpaceHierarchyError extends Error {
  constructor(spaceId: string) {
    super(`Property space "${spaceId}" has an inconsistent hierarchy.`);
    this.name = 'RentalAgreementSpaceHierarchyError';
  }
}

export class RentalAgreementSpacePropertyMismatchError extends Error {
  constructor(spaceId: string, propertyId: string) {
    super(`Property space "${spaceId}" does not belong to the selected property "${propertyId}".`);
    this.name = 'RentalAgreementSpacePropertyMismatchError';
  }
}

export class RentalAgreementPeriodConflictError extends Error {
  constructor(spaceId: string) {
    super(
      `The selected period overlaps another rental agreement on space "${spaceId}" or its hierarchy.`,
    );
    this.name = 'RentalAgreementPeriodConflictError';
  }
}

export class RentalAgreementTermsLockedError extends Error {
  constructor(id: string) {
    super(
      `Rental agreement "${id}" has started, so its rental terms can no longer be changed.`,
    );
    this.name = 'RentalAgreementTermsLockedError';
  }
}
