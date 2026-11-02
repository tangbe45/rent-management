import { compareCalendarDates } from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type {
  RentalAgreement,
  RentalAgreementLifecycle,
} from '../domain/rental-agreement';
import {
  DEFAULT_RENTAL_AGREEMENT_PAGE_SIZE,
  type RentalAgreementRepository,
} from '../domain/rental-agreement-repository';
import type { PropertyLookup } from './property-lookup';
import type { SpaceLookup } from './space-lookup';
import type { TenantLookup } from './tenant-lookup';

export interface ListRentalAgreementsInput {
  lifecycle?: RentalAgreementLifecycle;
  tenantId?: string;
  propertyId?: string;
  spaceId?: string;
  limit?: number;
  offset?: number;
}

export interface RentalAgreementListItem {
  agreement: RentalAgreement;
  lifecycle: RentalAgreementLifecycle;
  tenantName: string | null;
  propertyName: string | null;
  spaceName: string | null;
}

export interface RentalAgreementListPage {
  items: RentalAgreementListItem[];
  total: number;
}

/**
 * Lists agreements with their derived lifecycle and resolved tenant/property/
 * space names. Lifecycle is derived here (never stored), so filtering by
 * lifecycle happens after derivation and before pagination.
 */
export class ListRentalAgreements {
  constructor(
    private readonly deps: {
      agreements: RentalAgreementRepository;
      tenants: TenantLookup;
      properties: PropertyLookup;
      spaces: SpaceLookup;
      clock: Clock;
    },
  ) {}

  execute(input: ListRentalAgreementsInput = {}): RentalAgreementListPage {
    const limit =
      input.limit !== undefined && input.limit > 0
        ? Math.floor(input.limit)
        : DEFAULT_RENTAL_AGREEMENT_PAGE_SIZE;
    const offset = input.offset !== undefined && input.offset > 0 ? Math.floor(input.offset) : 0;
    const today = this.deps.clock.today();

    let spaceIds: string[] | undefined;
    if (input.spaceId !== undefined) {
      spaceIds = [input.spaceId];
    } else if (input.propertyId !== undefined) {
      spaceIds = this.deps.spaces.findByPropertyId(input.propertyId).map((space) => space.id);
    }

    const agreements = this.deps.agreements.findAll({
      tenantId: input.tenantId,
      spaceIds,
    });

    const withLifecycle = agreements
      .map((agreement) => ({ agreement, lifecycle: agreement.lifecycleOn(today) }))
      .filter((entry) => input.lifecycle === undefined || entry.lifecycle === input.lifecycle)
      .sort((left, right) => {
        const byStartDate = compareCalendarDates(
          right.agreement.startDate,
          left.agreement.startDate,
        );
        return byStartDate !== 0 ? byStartDate : right.agreement.createdAt - left.agreement.createdAt;
      });

    const items = withLifecycle
      .slice(offset, offset + limit)
      .map((entry) => this.toListItem(entry.agreement, entry.lifecycle));

    return { items, total: withLifecycle.length };
  }

  private toListItem(
    agreement: RentalAgreement,
    lifecycle: RentalAgreementLifecycle,
  ): RentalAgreementListItem {
    const tenant = this.deps.tenants.findById(agreement.tenantId);
    const space = this.deps.spaces.findById(agreement.spaceId);
    const property = space === null ? null : this.deps.properties.findById(space.propertyId);
    return {
      agreement,
      lifecycle,
      tenantName: tenant?.fullName ?? null,
      propertyName: property?.name ?? null,
      spaceName: space?.name ?? null,
    };
  }
}
