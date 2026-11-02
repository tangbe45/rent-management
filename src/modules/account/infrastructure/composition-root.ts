import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { database } from '../../../shared/infrastructure/database/connection';
import { ExpoCryptoIdGenerator } from '../../../shared/infrastructure/id-generator';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { AuthenticateWithPin } from '../application/authenticate-with-pin';
import { AuthenticationSession } from '../application/authentication-session';
import { GetApplicationState } from '../application/get-application-state';
import { GetOwnerProfile } from '../application/get-owner-profile';
import { InitializeApplication } from '../application/initialize-application';
import { VerifyCredential } from '../application/verify-credential';
import { DrizzleAccountRepository } from './drizzle-account-repository';
import { DrizzleInitializationUnitOfWork } from './drizzle-initialization-unit-of-work';
import { SecureStoreCredentialService } from './secure-store-credential-service';

const clock: Clock = new SystemClock();
const idGenerator: IdGenerator = new ExpoCryptoIdGenerator();

const accountsRepository = new DrizzleAccountRepository(database);
const credentialService = new SecureStoreCredentialService();

export const initializeApplication = new InitializeApplication({
  accounts: accountsRepository,
  unitOfWork: new DrizzleInitializationUnitOfWork(),
  credentialService,
  clock,
  idGenerator,
});

export const getApplicationState = new GetApplicationState({
  accounts: accountsRepository,
});

const verifyCredential = new VerifyCredential({
  accounts: accountsRepository,
  credentialService,
});

export { verifyCredential };

export const authenticationSession = new AuthenticationSession();

export const authenticateWithPin = new AuthenticateWithPin({
  verifyCredential,
  session: authenticationSession,
});

export const getOwnerProfile = new GetOwnerProfile({
  accounts: accountsRepository,
});