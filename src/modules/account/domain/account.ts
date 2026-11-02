export const ACCOUNT_NAME_MAX_LENGTH = 100;

export interface AccountData {
  id: string;
  fullName: string;
  createdAt: number;
}

export class Account {
  private constructor(
    readonly id: string,
    readonly fullName: string,
    readonly createdAt: number,
  ) {}

  static create(input: { id: string; fullName: string; createdAt: number }): Account {
    const fullName = input.fullName.trim();
    if (fullName.length === 0) {
      throw new InvalidAccountNameError('Full name is required.');
    }
    if (fullName.length > ACCOUNT_NAME_MAX_LENGTH) {
      throw new InvalidAccountNameError(
        `Full name must be at most ${ACCOUNT_NAME_MAX_LENGTH} characters.`,
      );
    }
    return new Account(input.id, fullName, input.createdAt);
  }

  static hydrate(data: AccountData): Account {
    const account = Account.create(data);
    return new Account(account.id, account.fullName, account.createdAt);
  }
}

export class InvalidAccountNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAccountNameError';
  }
}