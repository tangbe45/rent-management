import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { RentalAgreementRepositories } from './rental-agreement-unit-of-work';
import {
  RentalAgreementAncestorArchivedError,
  RentalAgreementPeriodConflictError,
  RentalAgreementPropertyArchivedError,
  RentalAgreementPropertyNotFoundError,
  RentalAgreementSpaceArchivedError,
  RentalAgreementSpaceHierarchyError,
  RentalAgreementSpaceNotRentableError,
  RentalAgreementSpaceNotFoundError,
  RentalAgreementSpacePropertyMismatchError,
  RentalAgreementTenantArchivedError,
  RentalAgreementTenantNotFoundError,
} from './rental-agreement-errors';

export interface AgreementPlacement {
  tenantId: string;
  propertyId: string;
  spaceId: string;
  startDate: CalendarDateString;
  effectiveEndDate: CalendarDateString | null;
}

/**
 * Validates that an agreement may be placed on a space for a period: the tenant,
 * property, space and every ancestor must exist and be active, the space must be
 * rentable and belong to the selected property, and the period must not overlap
 * any agreement on the space or its hierarchy, including historical ones.
 */
export function assertAgreementPlacement(
  repositories: RentalAgreementRepositories,
  placement: AgreementPlacement,
  options: { excludeAgreementId?: string } = {},
): void {
  const tenant = repositories.tenants.findById(placement.tenantId);
  if (tenant === null) {
    throw new RentalAgreementTenantNotFoundError(placement.tenantId);
  }
  if (!tenant.isActive) {
    throw new RentalAgreementTenantArchivedError(tenant.id);
  }

  const property = repositories.properties.findById(placement.propertyId);
  if (property === null) {
    throw new RentalAgreementPropertyNotFoundError(placement.propertyId);
  }
  if (!property.isActive) {
    throw new RentalAgreementPropertyArchivedError(property.id);
  }

  const space = repositories.spaces.findById(placement.spaceId);
  if (space === null) {
    throw new RentalAgreementSpaceNotFoundError(placement.spaceId);
  }
  if (!space.isActive) {
    throw new RentalAgreementSpaceArchivedError(space.id);
  }
  if (!space.rentable) {
    throw new RentalAgreementSpaceNotRentableError(space.id);
  }
  if (space.propertyId !== property.id) {
    throw new RentalAgreementSpacePropertyMismatchError(space.id, property.id);
  }

  const ancestors = repositories.spaces.findAncestors(space.id);
  for (const ancestor of ancestors) {
    if (ancestor.propertyId !== property.id) {
      throw new RentalAgreementSpaceHierarchyError(space.id);
    }
    if (!ancestor.isActive) {
      throw new RentalAgreementAncestorArchivedError(ancestor.id);
    }
  }

  const relatedSpaceIds = [
    space.id,
    ...ancestors.map((ancestor) => ancestor.id),
    ...repositories.spaces.findDescendantIds(space.id),
  ];

  const conflicts = repositories.agreements.findOverlapping({
    spaceIds: relatedSpaceIds,
    startDate: placement.startDate,
    effectiveEndDate: placement.effectiveEndDate,
    excludeAgreementId: options.excludeAgreementId,
  });
  if (conflicts.length > 0) {
    throw new RentalAgreementPeriodConflictError(conflicts[0]?.spaceId ?? placement.spaceId);
  }
}
