import { database } from '../../../shared/infrastructure/database/connection';
import { ExpoCryptoIdGenerator } from '../../../shared/infrastructure/id-generator';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { ArchiveProperty } from '../application/archive-property';
import { ArchivePropertySpace } from '../application/archive-property-space';
import { CreateProperty } from '../application/create-property';
import { CreatePropertySpace } from '../application/create-property-space';
import { GetProperty } from '../application/get-property';
import { GetPropertySpace } from '../application/get-property-space';
import { GetPropertyWorkspaceOverview } from '../application/get-property-workspace-overview';
import { ListArchivedProperties } from '../application/list-archived-properties';
import { ListProperties } from '../application/list-properties';
import { ListPropertySpaces } from '../application/list-property-spaces';
import { MovePropertySpace } from '../application/move-property-space';
import { RestoreProperty } from '../application/restore-property';
import { RestorePropertySpace } from '../application/restore-property-space';
import { UpdateProperty } from '../application/update-property';
import { UpdatePropertySpace } from '../application/update-property-space';
import { DrizzlePropertyRepository } from './drizzle-property-repository';
import { DrizzlePropertySpaceRepository } from './drizzle-property-space-repository';
import {
  preventPropertyArchiveQuery,
  preventSpaceArchiveQuery,
  agreementSpaceOccupancyQuery,
} from '../../rental-agreement-management/infrastructure/composition-root';

const clock = new SystemClock();
const idGenerator = new ExpoCryptoIdGenerator();

export const propertiesRepository = new DrizzlePropertyRepository(database);
export const propertySpacesRepository = new DrizzlePropertySpaceRepository(database);

const activeRentalAgreements = preventPropertyArchiveQuery;
const activeRentalAgreementsForSpaces = preventSpaceArchiveQuery;

export const createProperty = new CreateProperty({ properties: propertiesRepository, clock, idGenerator });

export const getProperty = new GetProperty({ properties: propertiesRepository });

export const listProperties = new ListProperties({ properties: propertiesRepository });

export const listArchivedProperties = new ListArchivedProperties({ properties: propertiesRepository });

export const updateProperty = new UpdateProperty({ properties: propertiesRepository, clock });

export const archiveProperty = new ArchiveProperty({
  properties: propertiesRepository,
  activeRentalAgreements,
  clock,
});

export const restoreProperty = new RestoreProperty({ properties: propertiesRepository, clock });

export const createPropertySpace = new CreatePropertySpace({
  spaces: propertySpacesRepository,
  properties: propertiesRepository,
  clock,
  idGenerator,
});

export const getPropertySpace = new GetPropertySpace({ spaces: propertySpacesRepository });

export const listPropertySpaces = new ListPropertySpaces({ spaces: propertySpacesRepository });

export const getPropertyWorkspaceOverview = new GetPropertyWorkspaceOverview({
  spaces: propertySpacesRepository,
  occupancy: agreementSpaceOccupancyQuery,
  clock,
});

export const updatePropertySpace = new UpdatePropertySpace({
  spaces: propertySpacesRepository,
  clock,
});

export const movePropertySpace = new MovePropertySpace({
  spaces: propertySpacesRepository,
  clock,
});

export const archivePropertySpace = new ArchivePropertySpace({
  spaces: propertySpacesRepository,
  activeRentalAgreements: activeRentalAgreementsForSpaces,
  clock,
});

export const restorePropertySpace = new RestorePropertySpace({
  spaces: propertySpacesRepository,
  properties: propertiesRepository,
  clock,
});