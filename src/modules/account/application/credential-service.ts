export interface EstablishCredentialInput {
  accountId: string;
  pin: string;
}

export interface VerifyCredentialInput {
  accountId: string;
  pin: string;
}

export interface CredentialService {
  establish(input: EstablishCredentialInput): Promise<void>;
  verify(input: VerifyCredentialInput): Promise<boolean>;
  remove(accountId: string): Promise<void>;
}