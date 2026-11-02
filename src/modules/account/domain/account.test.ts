import { Account } from './account';

describe('Account', () => {
  it('trims and stores a valid full name', () => {
    const account = Account.create({ id: 'acc-1', fullName: '  John Doe  ', createdAt: 42 });
    expect(account.fullName).toBe('John Doe');
  });

  it('rejects an empty full name', () => {
    expect(() => Account.create({ id: 'acc-1', fullName: '   ', createdAt: 42 })).toThrow(
      /Full name is required/,
    );
  });

  it('rejects an over-long full name', () => {
    expect(() =>
      Account.create({ id: 'acc-1', fullName: 'X'.repeat(101), createdAt: 42 }),
    ).toThrow(/at most 100 characters/);
  });

  it('hydrates a persisted account', () => {
    const account = Account.hydrate({ id: 'acc-1', fullName: 'John Doe', createdAt: 42 });
    expect(account.id).toBe('acc-1');
    expect(account.fullName).toBe('John Doe');
    expect(account.createdAt).toBe(42);
  });
});