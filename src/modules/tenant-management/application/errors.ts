export class TenantNotFoundError extends Error {
  constructor(id: string) {
    super(`Tenant "${id}" was not found.`);
    this.name = 'TenantNotFoundError';
  }
}

export class ArchiveBlockedByActiveTenantRentalAgreementsError extends Error {
  constructor(id: string) {
    super(`Tenant "${id}" cannot be archived because they have active rental agreements.`);
    this.name = 'ArchiveBlockedByActiveTenantRentalAgreementsError';
  }
}
