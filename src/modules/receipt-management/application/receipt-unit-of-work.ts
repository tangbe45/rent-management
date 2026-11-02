import type { ReceiptNumberSequenceRepository, ReceiptRepository } from '../domain/receipt-repository';

/**
 * Write-side repositories exposed inside a single SQLite transaction. Recording
 * the finalized receipt row and consuming its number must succeed or fail
 * together.
 */
export interface ReceiptRepositories {
  receipts: ReceiptRepository;
  sequence: ReceiptNumberSequenceRepository;
}

export interface ReceiptUnitOfWork {
  run<T>(work: (repositories: ReceiptRepositories) => T): T;
}