export class PropertyNotFoundError extends Error {
  constructor(id: string) {
    super(`Property "${id}" was not found.`);
    this.name = 'PropertyNotFoundError';
  }
}

export class ArchiveBlockedByActiveRentalAgreementsError extends Error {
  constructor(propertyId: string) {
    super(
      `Property "${propertyId}" cannot be archived because it has active rental agreements.`,
    );
    this.name = 'ArchiveBlockedByActiveRentalAgreementsError';
  }
}