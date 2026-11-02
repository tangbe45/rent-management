export class InvalidReceiptSnapshotError extends Error {
  constructor(reason: string) {
    super(`Invalid receipt snapshot: ${reason}.`);
    this.name = 'InvalidReceiptSnapshotError';
  }
}

export class InvalidReceiptError extends Error {
  constructor(reason: string) {
    super(`Invalid receipt: ${reason}.`);
    this.name = 'InvalidReceiptError';
  }
}