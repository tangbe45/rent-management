import { database } from '../../../shared/infrastructure/database/connection';
import { ExpoCryptoIdGenerator } from '../../../shared/infrastructure/id-generator';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { ArchiveTenant } from '../application/archive-tenant';
import { CreateTenant } from '../application/create-tenant';
import { GetTenant } from '../application/get-tenant';
import { ListArchivedTenants } from '../application/list-archived-tenants';
import { ListTenants } from '../application/list-tenants';
import { RestoreTenant } from '../application/restore-tenant';
import { UpdateTenant } from '../application/update-tenant';
import { preventTenantArchiveQuery } from '../../rental-agreement-management/infrastructure/composition-root';
import { DrizzleTenantRepository } from './drizzle-tenant-repository';

const tenants = new DrizzleTenantRepository(database);
const clock = new SystemClock();
const idGenerator = new ExpoCryptoIdGenerator();
const activeTenantRentalAgreements = preventTenantArchiveQuery;

export const createTenant = new CreateTenant({ tenants, clock, idGenerator });
export const getTenant = new GetTenant({ tenants });
export const listTenants = new ListTenants({ tenants });
export const listArchivedTenants = new ListArchivedTenants({ tenants });
export const updateTenant = new UpdateTenant({ tenants, clock });
export const archiveTenant = new ArchiveTenant({ tenants, activeRentalAgreements: activeTenantRentalAgreements, clock });
export const restoreTenant = new RestoreTenant({ tenants, clock });
