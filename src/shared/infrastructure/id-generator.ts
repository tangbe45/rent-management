import { randomUUID } from 'expo-crypto';

import type { IdGenerator } from '../domain/id-generator';

export class ExpoCryptoIdGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}