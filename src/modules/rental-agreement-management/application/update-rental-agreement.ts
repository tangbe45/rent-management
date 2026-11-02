import type { Clock } from '../../../shared/domain/clock';
import type { RentInstallmentResetPort } from '../../rent-payment-management/application/reset-agreement-installments';
import type { RentalAgreement } from '../domain/rental-agreement';
import {
  RentalAgreementNotFoundError,
  RentalAgreementTermsLockedError,
} from './rental-agreement-errors';
import type { RentalAgreementUnitOfWork } from './rental-agreement-unit-of-work';
import { assertAgreementPlacement } from './rental-agreement-validation';

export interface UpdateRentalAgreementInput {
  id: string;
  tenantId: string;
  propertyId: string;
  spaceId: string;
  startDate: string;
  endDate?: string | null;
  rentAmount: number;
  rentFrequency: string;
  firstRentDueDate: string;
  securityDepositAmount?: number | null;
  notes?: string | null;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = value.trim();
  return text.length === 0 ? null : text;
}

/**
 * Edits an agreement. Before the start date all rental terms may change and are
 * fully revalidated against the tenant/property/space hierarchy and overlap
 * rules. On or after the start date only notes may change, so historical terms
 * are never silently mutated; replacing terms requires terminating the current
 * agreement and creating a replacement.
 *
 * When the terms change before the start date, any previously materialized rent
 * installments are discarded through the payment module's reset port so they can
 * be regenerated from the revised schedule. If an active payment still touches
 * the agreement the reset (and therefore the edit) is blocked until those
 * payments are reversed.
 */
export class UpdateRentalAgreement {
  constructor(
    private readonly deps: {
      unitOfWork: RentalAgreementUnitOfWork;
      clock: Clock;
      installments?: RentInstallmentResetPort;
    },
  ) {}

  execute(input: UpdateRentalAgreementInput): RentalAgreement {
    return this.deps.unitOfWork.run((repositories) => {
      const existing = repositories.agreements.findById(input.id);
      if (existing === null) {
        throw new RentalAgreementNotFoundError(input.id);
      }

      const today = this.deps.clock.today();
      if (existing.hasStartedOn(today)) {
        if (!sameLockedTerms(existing, input)) {
          throw new RentalAgreementTermsLockedError(existing.id);
        }
        const updated = existing.updateNotes(input.notes, this.deps.clock.now());
        repositories.agreements.update(updated);
        return updated;
      }

      if (this.deps.installments !== undefined && !sameLockedTerms(existing, input)) {
        this.deps.installments.resetForAgreement(existing.id);
      }

      const updated = existing.reviseTerms({
        tenantId: input.tenantId,
        spaceId: input.spaceId,
        startDate: input.startDate,
        endDate: input.endDate,
        rentAmount: input.rentAmount,
        rentFrequency: input.rentFrequency,
        firstRentDueDate: input.firstRentDueDate,
        securityDepositAmount: input.securityDepositAmount,
        notes: input.notes,
        updatedAt: this.deps.clock.now(),
      });

      assertAgreementPlacement(
        repositories,
        {
          tenantId: updated.tenantId,
          propertyId: input.propertyId,
          spaceId: updated.spaceId,
          startDate: updated.startDate,
          effectiveEndDate: updated.effectiveEndDate,
        },
        { excludeAgreementId: updated.id },
      );

      repositories.agreements.update(updated);
      return updated;
    });
  }
}

function sameLockedTerms(existing: RentalAgreement, input: UpdateRentalAgreementInput): boolean {
  return (
    existing.tenantId === input.tenantId &&
    existing.spaceId === input.spaceId &&
    existing.startDate === input.startDate.trim() &&
    existing.endDate === normalizeOptionalText(input.endDate) &&
    existing.rentAmount === input.rentAmount &&
    existing.rentFrequency === input.rentFrequency &&
    existing.firstRentDueDate === input.firstRentDueDate.trim() &&
    existing.securityDepositAmount === (input.securityDepositAmount ?? null)
  );
}
