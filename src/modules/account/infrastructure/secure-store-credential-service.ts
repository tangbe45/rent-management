import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytesAsync } from 'expo-crypto';
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

import type {
  CredentialService,
  EstablishCredentialInput,
  VerifyCredentialInput,
} from '../application/credential-service';
import { Pin } from '../domain/pin';

const CREDENTIAL_KEY_PREFIX = 'rental-manager.credential';

function keyFor(accountId: string): string {
  return `${CREDENTIAL_KEY_PREFIX}.${accountId}`;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function hashCredential(saltHex: string, pin: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, `${saltHex}:${pin}`);
}

function hexEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Checks a plain PIN against a stored `saltHex:hashHex` value. Any malformed
 * stored value (missing/empty parts) is rejected.
 */
export async function credentialMatches(pin: string, storedValue: string): Promise<boolean> {
  const separatorIndex = storedValue.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === storedValue.length - 1) {
    return false;
  }
  const salt = storedValue.slice(0, separatorIndex);
  const expectedHash = storedValue.slice(separatorIndex + 1);
  const actualHash = await hashCredential(salt, pin);
  return hexEqual(actualHash, expectedHash);
}

export class SecureStoreCredentialService implements CredentialService {
  async establish(input: EstablishCredentialInput): Promise<void> {
    const pin = Pin.create(input.pin);
    const salt = toHex(await getRandomBytesAsync(16));
    const hash = await hashCredential(salt, pin.value);
    await setItemAsync(keyFor(input.accountId), `${salt}:${hash}`);
  }

  async verify(input: VerifyCredentialInput): Promise<boolean> {
    let pin: Pin;
    try {
      pin = Pin.create(input.pin);
    } catch {
      return false;
    }
    const storedValue = await getItemAsync(keyFor(input.accountId));
    if (storedValue === null) {
      return false;
    }
    return credentialMatches(pin.value, storedValue);
  }

  async remove(accountId: string): Promise<void> {
    await deleteItemAsync(keyFor(accountId));
  }
}