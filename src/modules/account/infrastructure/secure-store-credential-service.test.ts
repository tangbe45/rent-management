import {
  credentialMatches,
  hashCredential,
  SecureStoreCredentialService,
} from './secure-store-credential-service';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algorithm: unknown, data: string) => {
    const separatorIndex = data.indexOf(':');
    return separatorIndex === -1 ? data : data.slice(separatorIndex + 1);
  }),
  getRandomBytesAsync: jest.fn(async () => new Uint8Array(16)),
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

describe('credentialMatches', () => {
  it('accepts the PIN that matches the stored value', async () => {
    await expect(credentialMatches('1234', 'aabbccdd:1234')).resolves.toBe(true);
  });

  it('rejects a PIN that does not match the stored value', async () => {
    await expect(credentialMatches('9999', 'aabbccdd:1234')).resolves.toBe(false);
  });

  it('rejects a malformed stored value', async () => {
    await expect(credentialMatches('1234', 'no-separator')).resolves.toBe(false);
    await expect(credentialMatches('1234', '')).resolves.toBe(false);
    await expect(credentialMatches('1234', ':hash-only')).resolves.toBe(false);
    await expect(credentialMatches('1234', 'salt-only:')).resolves.toBe(false);
  });
});

describe('hashCredential', () => {
  it('is deterministic for the same salt and PIN', async () => {
    await expect(hashCredential('aabbccdd', '1234')).resolves.toBe('1234');
    await expect(hashCredential('aabbccdd', '1234')).resolves.toBe('1234');
  });
});

describe('SecureStoreCredentialService.verify', () => {
  it('accepts the correct PIN after establish', async () => {
    const service = new SecureStoreCredentialService();
    await service.establish({ accountId: 'acc-1', pin: '1234' });

    await expect(service.verify({ accountId: 'acc-1', pin: '1234' })).resolves.toBe(true);
  });

  it('rejects an incorrect PIN', async () => {
    const service = new SecureStoreCredentialService();
    await service.establish({ accountId: 'acc-1', pin: '1234' });

    await expect(service.verify({ accountId: 'acc-1', pin: '9999' })).resolves.toBe(false);
  });

  it('rejects when no credential exists', async () => {
    const service = new SecureStoreCredentialService();
    await expect(service.verify({ accountId: 'never-seen', pin: '1234' })).resolves.toBe(false);
  });

  it('rejects an invalid PIN format', async () => {
    const service = new SecureStoreCredentialService();
    await service.establish({ accountId: 'acc-1', pin: '1234' });

    await expect(service.verify({ accountId: 'acc-1', pin: '12345' })).resolves.toBe(false);
    await expect(service.verify({ accountId: 'acc-1', pin: '12a4' })).resolves.toBe(false);
  });

  it('still accepts after remove has cleared the credential', async () => {
    const service = new SecureStoreCredentialService();
    await service.establish({ accountId: 'acc-1', pin: '1234' });
    await service.remove('acc-1');

    await expect(service.verify({ accountId: 'acc-1', pin: '1234' })).resolves.toBe(false);
  });
});