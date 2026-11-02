import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { RentFrequency } from '../../rental-agreement-management/domain/rental-agreement';

/**
 * The read-only projection of a rental agreement that the payment module needs:
 * identity, tenant/space context, the rent terms and the effective end date.
 * Terms stay owned by Rental Agreement Management; the payment module never
 * duplicates or edits them.
 */
export interface RentAgreementReference {
  id: string;
  tenantId: string;
  spaceId: string;
  rentAmount: number;
  rentFrequency: RentFrequency;
  firstRentDueDate: CalendarDateString;
  startDate: CalendarDateString;
  effectiveEndDate: CalendarDateString | null;
}

/**
 * Read-only boundary to rental agreements. Implemented in infrastructure against
 * the `rental_agreements` table so the payment module never imports another
 * module's composition root or repository.
 */
export interface RentalAgreementLookup {
  findById(id: string): RentAgreementReference | null;
  findByTenantId(tenantId: string): RentAgreementReference[];
  findAll(): RentAgreementReference[];
}
