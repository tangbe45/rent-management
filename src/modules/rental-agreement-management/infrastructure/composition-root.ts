import { database } from '../../../shared/infrastructure/database/connection';
import { ExpoCryptoIdGenerator } from '../../../shared/infrastructure/id-generator';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { CreateRentalAgreement } from '../application/create-rental-agreement';
import { GetRentalAgreement } from '../application/get-rental-agreement';
import { GetRentSchedule } from '../application/get-rent-schedule';
import { ListRentalAgreements } from '../application/list-rental-agreements';
import { PreventPropertyArchiveQuery } from '../application/prevent-property-archive-query';
import { PreventSpaceArchiveQuery } from '../application/prevent-space-archive-query';
import { PreventTenantArchiveQuery } from '../application/prevent-tenant-archive-query';
import { TerminateRentalAgreement } from '../application/terminate-rental-agreement';
import { UpdateRentalAgreement } from '../application/update-rental-agreement';
import { DrizzlePropertyLookup } from './drizzle-property-lookup';
import { DrizzleRentalAgreementRepository } from './drizzle-rental-agreement-repository';
import { DrizzleRentalAgreementUnitOfWork } from './drizzle-rental-agreement-unit-of-work';
import { DrizzleSpaceLookup } from './drizzle-space-lookup';
import { DrizzleTenantLookup } from './drizzle-tenant-lookup';
import { AgreementSpaceOccupancyQuery } from './agreement-space-occupancy-query';
import { resetAgreementInstallments } from '../../rent-payment-management/infrastructure/composition-root';

const clock = new SystemClock();
const idGenerator = new ExpoCryptoIdGenerator();

const agreements = new DrizzleRentalAgreementRepository(database);
const tenants = new DrizzleTenantLookup(database);
const properties = new DrizzlePropertyLookup(database);
const spaces = new DrizzleSpaceLookup(database);
const unitOfWork = new DrizzleRentalAgreementUnitOfWork();

export const agreementSpaceOccupancyQuery = new AgreementSpaceOccupancyQuery({ agreements });

export const createRentalAgreement = new CreateRentalAgreement({ unitOfWork, clock, idGenerator });
export const getRentalAgreement = new GetRentalAgreement({ agreements });
export const listRentalAgreements = new ListRentalAgreements({
  agreements,
  tenants,
  properties,
  spaces,
  clock,
});
export const updateRentalAgreement = new UpdateRentalAgreement({
  unitOfWork,
  clock,
  installments: resetAgreementInstallments,
});
export const terminateRentalAgreement = new TerminateRentalAgreement({ agreements, clock });
export const getRentSchedule = new GetRentSchedule({ agreements, clock });

/**
 * Agreement-aware archive guards, wired into the Property and Tenant composition
 * roots to replace their placeholders.
 */
export const preventTenantArchiveQuery = new PreventTenantArchiveQuery({ agreements, clock });
export const preventPropertyArchiveQuery = new PreventPropertyArchiveQuery({
  agreements,
  spaces,
  clock,
});
export const preventSpaceArchiveQuery = new PreventSpaceArchiveQuery({
  agreements,
  spaces,
  clock,
});
