import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { RentalAgreement, type RentalAgreementData } from '../domain/rental-agreement';
import type {
  RentalAgreementFilter,
  RentalAgreementOverlapQuery,
  RentalAgreementRepository,
} from '../domain/rental-agreement-repository';
import type { PropertyLookup, PropertyReference } from './property-lookup';
import type { RentalAgreementRepositories, RentalAgreementUnitOfWork } from './rental-agreement-unit-of-work';
import type { SpaceLookup, SpaceReference } from './space-lookup';
import type { TenantLookup, TenantReference } from './tenant-lookup';

export class InMemoryRentalAgreementRepository implements RentalAgreementRepository {
  private readonly store = new Map<string, RentalAgreement>();

  save(agreement: RentalAgreement): void {
    this.store.set(agreement.id, agreement);
  }

  update(agreement: RentalAgreement): void {
    this.store.set(agreement.id, agreement);
  }

  findById(id: string): RentalAgreement | null {
    return this.store.get(id) ?? null;
  }

  findAll(filter: RentalAgreementFilter = {}): RentalAgreement[] {
    return [...this.store.values()].filter((agreement) => {
      if (filter.tenantId !== undefined && agreement.tenantId !== filter.tenantId) {
        return false;
      }
      if (filter.spaceIds !== undefined && !filter.spaceIds.includes(agreement.spaceId)) {
        return false;
      }
      return true;
    });
  }

  findOverlapping(query: RentalAgreementOverlapQuery): RentalAgreement[] {
    return [...this.store.values()].filter((agreement) => {
      if (query.excludeAgreementId !== undefined && agreement.id === query.excludeAgreementId) {
        return false;
      }
      if (!query.spaceIds.includes(agreement.spaceId)) {
        return false;
      }
      return agreement.overlaps({
        startDate: query.startDate,
        effectiveEndDate: query.effectiveEndDate,
      });
    });
  }

  get all(): RentalAgreement[] {
    return [...this.store.values()];
  }
}

export class StubTenantLookup implements TenantLookup {
  private readonly tenants = new Map<string, TenantReference>();

  constructor(tenants: TenantReference[] = []) {
    for (const tenant of tenants) {
      this.tenants.set(tenant.id, tenant);
    }
  }

  findById(id: string): TenantReference | null {
    return this.tenants.get(id) ?? null;
  }

  archive(id: string): void {
    const tenant = this.tenants.get(id);
    if (tenant !== undefined) {
      this.tenants.set(id, { ...tenant, isActive: false });
    }
  }
}

export class StubPropertyLookup implements PropertyLookup {
  private readonly properties = new Map<string, PropertyReference>();

  constructor(properties: PropertyReference[] = []) {
    for (const property of properties) {
      this.properties.set(property.id, property);
    }
  }

  findById(id: string): PropertyReference | null {
    return this.properties.get(id) ?? null;
  }

  archive(id: string): void {
    const property = this.properties.get(id);
    if (property !== undefined) {
      this.properties.set(id, { ...property, isActive: false });
    }
  }
}

export class StubSpaceLookup implements SpaceLookup {
  private readonly spaces = new Map<string, SpaceReference>();

  constructor(spaces: SpaceReference[] = []) {
    for (const space of spaces) {
      this.spaces.set(space.id, space);
    }
  }

  findById(id: string): SpaceReference | null {
    return this.spaces.get(id) ?? null;
  }

  findAncestors(spaceId: string): SpaceReference[] {
    const ancestors: SpaceReference[] = [];
    let current = this.spaces.get(spaceId)?.parentSpaceId ?? null;
    while (current !== null) {
      const parent = this.spaces.get(current);
      if (parent === undefined) {
        break;
      }
      ancestors.push(parent);
      current = parent.parentSpaceId;
    }
    return ancestors;
  }

  findDescendantIds(spaceId: string): string[] {
    const descendants: string[] = [];
    const frontier = [spaceId];
    while (frontier.length > 0) {
      const current = frontier.pop() as string;
      for (const space of this.spaces.values()) {
        if (space.parentSpaceId === current) {
          descendants.push(space.id);
          frontier.push(space.id);
        }
      }
    }
    return descendants;
  }

  findByPropertyId(propertyId: string): SpaceReference[] {
    return [...this.spaces.values()].filter((space) => space.propertyId === propertyId);
  }

  archive(id: string): void {
    const space = this.spaces.get(id);
    if (space !== undefined) {
      this.spaces.set(id, { ...space, isActive: false });
    }
  }
}

export class InMemoryRentalAgreementUnitOfWork implements RentalAgreementUnitOfWork {
  constructor(private readonly repositories: RentalAgreementRepositories) {}

  run<T>(work: (repositories: RentalAgreementRepositories) => T): T {
    return work(this.repositories);
  }
}

export class FakeRentalAgreementClock implements Clock {
  constructor(
    private current = 1000,
    private currentDate = '2026-10-08',
  ) {}

  today(): string {
    return this.currentDate;
  }

  now(): number {
    return this.current;
  }

  setNow(value: number): void {
    this.current = value;
  }

  setToday(value: string): void {
    this.currentDate = value;
  }
}

export class SequentialRentalAgreementIdGenerator implements IdGenerator {
  private count = 0;

  constructor(private readonly prefix = 'agreement') {}

  next(): string {
    this.count += 1;
    return `${this.prefix}-${this.count}`;
  }
}

export function agreementAt(
  overrides: Partial<RentalAgreementData> & { id: string },
): RentalAgreement {
  return RentalAgreement.hydrate({
    tenantId: 'tenant-1',
    spaceId: 'space-1',
    startDate: '2026-01-01',
    endDate: null,
    terminationDate: null,
    rentAmount: 50_000,
    rentFrequency: 'MONTHLY',
    firstRentDueDate: '2026-01-01',
    securityDepositAmount: null,
    notes: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  });
}

export function tenantRef(id: string, isActive = true): TenantReference {
  return { id, fullName: `Tenant ${id}`, isActive };
}

export function propertyRef(id: string, isActive = true): PropertyReference {
  return { id, name: `Property ${id}`, isActive };
}

export function spaceRef(overrides: {
  id: string;
  propertyId?: string;
  parentSpaceId?: string | null;
  name?: string;
  rentable?: boolean;
  isActive?: boolean;
}): SpaceReference {
  return {
    propertyId: 'property-1',
    parentSpaceId: null,
    name: `Space ${overrides.id}`,
    rentable: true,
    isActive: true,
    ...overrides,
  };
}
