import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { Account } from '../domain/account';
import type { AccountRepository } from '../domain/account-repository';
import { Pin } from '../domain/pin';
import { Subscription } from '../../subscription/domain/subscription';
import type { SubscriptionRepository } from '../../subscription/domain/subscription-repository';
import type { CredentialService } from './credential-service';
import { ApplicationAlreadyInitializedError } from './errors';
import { GetApplicationState } from './get-application-state';
import { InitializeApplication } from './initialize-application';
import type { InitializationRepositories, InitializationUnitOfWork } from './unit-of-work';

class FakeAccountRepository implements AccountRepository {
  private readonly rows: Account[] = [];

  save(account: Account): void {
    this.rows.push(account);
  }

  findFirst(): Account | null {
    return this.rows[0] ?? null;
  }

  get accounts(): Account[] {
    return this.rows;
  }
}

class FakeSubscriptionRepository implements SubscriptionRepository {
  private readonly rows: Subscription[] = [];

  save(subscription: Subscription): void {
    this.rows.push(subscription);
  }

  findAll(): Subscription[] {
    return [...this.rows];
  }

  get subscriptions(): Subscription[] {
    return this.rows;
  }
}

class FakeInitializationUnitOfWork implements InitializationUnitOfWork {
  failOnCommit = false;
  private commits = 0;

  constructor(private readonly target: InitializationRepositories) {}

  get commitCount(): number {
    return this.commits;
  }

  run<T>(work: (repositories: InitializationRepositories) => T): T {
    const stagedAccounts: Account[] = [];
    const stagedSubscriptions: Subscription[] = [];
    const staging: InitializationRepositories = {
      accounts: {
        save: (account) => stagedAccounts.push(account),
        findFirst: () => stagedAccounts[0] ?? null,
      },
      subscriptions: {
        save: (subscription) => stagedSubscriptions.push(subscription),
        findAll: () => [...stagedSubscriptions],
      },
    };

    const result = work(staging);

    if (this.failOnCommit) {
      throw new Error('simulated commit failure');
    }

    this.commits += 1;
    for (const account of stagedAccounts) {
      this.target.accounts.save(account);
    }
    for (const subscription of stagedSubscriptions) {
      this.target.subscriptions.save(subscription);
    }
    return result;
  }
}

class FakeCredentialService implements CredentialService {
  private readonly stored = new Map<string, string>();
  private readonly removedAccountIds: string[] = [];

  async establish(input: { accountId: string; pin: string }): Promise<void> {
    const pin = Pin.create(input.pin);
    this.stored.set(input.accountId, pin.value);
  }

  async verify(input: { accountId: string; pin: string }): Promise<boolean> {
    return this.stored.get(input.accountId) === input.pin;
  }

  async remove(accountId: string): Promise<void> {
    this.removedAccountIds.push(accountId);
    this.stored.delete(accountId);
  }

  has(accountId: string): boolean {
    return this.stored.has(accountId);
  }

  get removals(): string[] {
    return [...this.removedAccountIds];
  }
}

class FakeClock implements Clock {
  constructor(
    private readonly todayValue: CalendarDateString,
    private readonly nowValue: number,
  ) {}

  today(): CalendarDateString {
    return this.todayValue;
  }

  now(): number {
    return this.nowValue;
  }
}

class SequentialIdGenerator implements IdGenerator {
  private index = 0;

  constructor(private readonly ids: string[]) {}

  next(): string {
    const id = this.ids[this.index];
    this.index += 1;
    if (id === undefined) {
      throw new Error('Test id generator is exhausted.');
    }
    return id;
  }
}

function build() {
  const accounts = new FakeAccountRepository();
  const subscriptions = new FakeSubscriptionRepository();
  const unitOfWork = new FakeInitializationUnitOfWork({ accounts, subscriptions });
  const credentialService = new FakeCredentialService();
  const clock = new FakeClock('2026-10-08', 1_723_123_200_000);
  const idGenerator = new SequentialIdGenerator(['acc-1', 'sub-1']);
  const initializeApplication = new InitializeApplication({
    accounts,
    unitOfWork,
    credentialService,
    clock,
    idGenerator,
  });
  return { accounts, subscriptions, unitOfWork, credentialService, initializeApplication };
}

describe('InitializeApplication', () => {
  it('creates an account, a 30-day trial and a credential', async () => {
    const { accounts, subscriptions, credentialService, initializeApplication } = build();
    const result = await initializeApplication.execute({ fullName: '  John Doe  ', pin: '1234' });

    expect(result.account.id).toBe('acc-1');
    expect(result.account.fullName).toBe('John Doe');
    expect(accounts.accounts).toHaveLength(1);
    expect(accounts.accounts[0]?.fullName).toBe('John Doe');

    expect(result.subscription.type).toBe('TRIAL');
    expect(result.subscription.startDate).toBe('2026-10-08');
    expect(result.subscription.endDate).toBe('2026-11-06');
    expect(subscriptions.subscriptions).toHaveLength(1);

    expect(credentialService.has('acc-1')).toBe(true);
    expect(credentialService.removals).toHaveLength(0);
  });

  it('completes setup using only a name and PIN — no password is required', async () => {
    const { accounts, subscriptions, credentialService, initializeApplication } = build();
    const result = await initializeApplication.execute({ fullName: 'John Doe', pin: '1234' });

    expect(result.subscription.type).toBe('TRIAL');
    expect(accounts.accounts).toHaveLength(1);
    expect(subscriptions.subscriptions).toHaveLength(1);
    expect(credentialService.has('acc-1')).toBe(true);
  });

  it('rejects initialization when the application already has an account', async () => {
    const { accounts, credentialService, initializeApplication } = build();
    accounts.save(Account.create({ id: 'existing', fullName: 'Existing', createdAt: 1 }));

    await expect(
      initializeApplication.execute({ fullName: 'John Doe', pin: '1234' }),
    ).rejects.toBeInstanceOf(ApplicationAlreadyInitializedError);
    expect(credentialService.removals).toHaveLength(0);
  });

  it('does not create a second trial when initialization is attempted on an initialized app', async () => {
    const { accounts, subscriptions, initializeApplication } = build();
    accounts.save(Account.create({ id: 'existing', fullName: 'Existing', createdAt: 1 }));
    subscriptions.save(
      Subscription.createTrial({ id: 'trial-1', startDate: '2026-10-08', createdAt: 1 }),
    );

    await expect(
      initializeApplication.execute({ fullName: 'John Doe', pin: '1234' }),
    ).rejects.toBeInstanceOf(ApplicationAlreadyInitializedError);
    expect(subscriptions.subscriptions).toHaveLength(1);
  });

  it('rejects an invalid account name without persisting anything', async () => {
    const { accounts, subscriptions, credentialService, initializeApplication } = build();
    await expect(
      initializeApplication.execute({ fullName: '   ', pin: '1234' }),
    ).rejects.toThrow(/Full name is required/);
    expect(accounts.accounts).toHaveLength(0);
    expect(subscriptions.subscriptions).toHaveLength(0);
    expect(credentialService.has('acc-1')).toBe(false);
  });

  it('rejects an invalid pin without persisting anything', async () => {
    const { accounts, subscriptions, credentialService, initializeApplication } = build();
    await expect(
      initializeApplication.execute({ fullName: 'John Doe', pin: '12345' }),
    ).rejects.toThrow(/PIN must be exactly 4 digits/);
    expect(accounts.accounts).toHaveLength(0);
    expect(subscriptions.subscriptions).toHaveLength(0);
    expect(credentialService.has('acc-1')).toBe(false);
  });

  it('removes the credential when the database transaction fails to commit', async () => {
    const { accounts, subscriptions, unitOfWork, credentialService, initializeApplication } =
      build();
    unitOfWork.failOnCommit = true;

    await expect(
      initializeApplication.execute({ fullName: 'John Doe', pin: '1234' }),
    ).rejects.toThrow('simulated commit failure');
    expect(accounts.accounts).toHaveLength(0);
    expect(subscriptions.subscriptions).toHaveLength(0);
    expect(credentialService.removals).toEqual(['acc-1']);
  });
});

describe('GetApplicationState', () => {
  it('reports uninitialized before setup and initialized after', async () => {
    const { accounts, initializeApplication } = build();
    const state = new GetApplicationState({ accounts });
    expect((await state.execute()).initialized).toBe(false);
    await initializeApplication.execute({ fullName: 'John Doe', pin: '1234' });
    expect((await state.execute()).initialized).toBe(true);
  });
});