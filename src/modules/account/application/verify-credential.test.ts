import { Account } from '../domain/account';
import type { AccountRepository } from '../domain/account-repository';
import type { CredentialService } from './credential-service';
import { VerifyCredential } from './verify-credential';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly first: Account | null) {}

  save(_account: Account): void {}

  findFirst(): Account | null {
    return this.first;
  }
}

class FakeCredentialService implements CredentialService {
  constructor(private readonly validPin: string | null) {}

  async establish(): Promise<void> {}

  async remove(): Promise<void> {}

  async verify(input: { accountId: string; pin: string }): Promise<boolean> {
    return this.validPin !== null && input.pin === this.validPin;
  }
}

function build(options: { account: Account | null; validPin: string | null }) {
  const accounts = new FakeAccountRepository(options.account);
  const credentialService = new FakeCredentialService(options.validPin);
  return new VerifyCredential({ accounts, credentialService });
}

describe('VerifyCredential', () => {
  it('authenticates the landlord when the PIN matches the stored credential', async () => {
    const account = Account.create({ id: 'acc-1', fullName: 'John Doe', createdAt: 1 });
    const useCase = build({ account, validPin: '1234' });

    await expect(useCase.execute({ pin: '1234' })).resolves.toBe(true);
  });

  it('rejects the landlord when the PIN does not match', async () => {
    const account = Account.create({ id: 'acc-1', fullName: 'John Doe', createdAt: 1 });
    const useCase = build({ account, validPin: '1234' });

    await expect(useCase.execute({ pin: '9999' })).resolves.toBe(false);
  });

  it('rejects when the application has not been set up', async () => {
    const useCase = build({ account: null, validPin: '1234' });

    await expect(useCase.execute({ pin: '1234' })).resolves.toBe(false);
  });

  it('rejects when no credential has been stored', async () => {
    const account = Account.create({ id: 'acc-1', fullName: 'John Doe', createdAt: 1 });
    const useCase = build({ account, validPin: null });

    await expect(useCase.execute({ pin: '1234' })).resolves.toBe(false);
  });
});