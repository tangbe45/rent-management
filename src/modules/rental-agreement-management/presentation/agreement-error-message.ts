import type { TranslationKey } from '../../../shared/i18n';
import {
  InvalidRentalAgreementTerminationDateError,
  RentalAgreementAlreadyTerminatedError,
} from '../domain/rental-agreement';
import {
  RentalAgreementAncestorArchivedError,
  RentalAgreementNotFoundError,
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
  RentalAgreementTermsLockedError,
} from '../application/rental-agreement-errors';

/**
 * Maps a thrown rental-agreement error to a user-facing translation key. Unknown
 * errors fall back to a generic message so no internal detail is ever leaked.
 */
export function agreementErrorKey(error: unknown): TranslationKey {
  if (error instanceof RentalAgreementTenantNotFoundError) {
    return 'agreements.error.tenantNotFound';
  }
  if (error instanceof RentalAgreementTenantArchivedError) {
    return 'agreements.error.tenantArchived';
  }
  if (error instanceof RentalAgreementPropertyNotFoundError) {
    return 'agreements.error.propertyNotFound';
  }
  if (error instanceof RentalAgreementPropertyArchivedError) {
    return 'agreements.error.propertyArchived';
  }
  if (error instanceof RentalAgreementSpaceNotFoundError) {
    return 'agreements.error.spaceNotFound';
  }
  if (error instanceof RentalAgreementSpaceArchivedError) {
    return 'agreements.error.spaceArchived';
  }
  if (error instanceof RentalAgreementSpaceNotRentableError) {
    return 'agreements.error.spaceNotRentable';
  }
  if (error instanceof RentalAgreementAncestorArchivedError) {
    return 'agreements.error.ancestorArchived';
  }
  if (error instanceof RentalAgreementSpaceHierarchyError) {
    return 'agreements.error.spaceHierarchy';
  }
  if (error instanceof RentalAgreementSpacePropertyMismatchError) {
    return 'agreements.error.spacePropertyMismatch';
  }
  if (error instanceof RentalAgreementPeriodConflictError) {
    return 'agreements.error.periodConflict';
  }
  if (error instanceof RentalAgreementTermsLockedError) {
    return 'agreements.error.termsLocked';
  }
  if (error instanceof RentalAgreementAlreadyTerminatedError) {
    return 'agreements.error.alreadyTerminated';
  }
  if (error instanceof RentalAgreementNotFoundError) {
    return 'agreements.error.notFound';
  }
  if (error instanceof InvalidRentalAgreementTerminationDateError) {
    return 'agreements.error.terminationDate';
  }
  return 'agreements.error.generic';
}
