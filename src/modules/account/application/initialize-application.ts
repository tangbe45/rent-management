import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { CreateTrialSubscription } from '../../subscription/application/create-trial-subscription';
import type { Subscription } from '../../subscription/domain/subscription';
import type { Account } from '../domain/account';
import type { AccountRepository } from '../domain/account-repository';
import { CreateAccount } from './create-account';
import type { CredentialService } from './credential-service';
import { ApplicationAlreadyInitializedError } from './errors';
import type { InitializationUnitOfWork } from './unit-of-work';

export interface InitializeApplicationInput {
  fullName: string;
  pin: string;
}

export interface InitializationResult {
  account: Account;
  subscription: Subscription;
}

export class InitializeApplication {
  constructor(
    private readonly deps: {
      accounts: AccountRepository;
      unitOfWork: InitializationUnitOfWork;
      credentialService: CredentialService;
      clock: Clock;
      idGenerator: IdGenerator;
    },
  ) {}

  async execute(input: InitializeApplicationInput): Promise<InitializationResult> {
    const accountId = this.deps.idGenerator.next();
    const subscriptionId = this.deps.idGenerator.next();
    const startDate = this.deps.clock.today();
    const createdAt = this.deps.clock.now();

    if ((await this.deps.accounts.findFirst()) !== null) {
      throw new ApplicationAlreadyInitializedError();
    }

    // The credential lives outside SQLite (SecureStore), so it cannot join the
    // database transaction. Write it first; nothing is persisted to SQLite yet,
    // so a failure here leaves the application uninitialized.
    await this.deps.credentialService.establish({ accountId, pin: input.pin });

    try {
      return this.deps.unitOfWork.run((repositories) => {
        const account = new CreateAccount({ accounts: repositories.accounts }).execute({
          id: accountId,
          fullName: input.fullName,
          createdAt,
        });
        const subscription = new CreateTrialSubscription({
          subscriptions: repositories.subscriptions,
        }).execute({ id: subscriptionId, startDate, createdAt });
        return { account, subscription };
      });
    } catch (error) {
      await this.deps.credentialService.remove(accountId).catch(() => {
        // Best-effort rollback: the account/subscription transaction was rolled
        // back, so a leftover credential must not grant access to a half-set up
        // application.
      });
      throw error;
    }
  }
}