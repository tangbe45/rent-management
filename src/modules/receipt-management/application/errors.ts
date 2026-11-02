export class ReceiptPaymentNotFoundError extends Error {
  constructor(paymentId: string) {
    super(`Rent payment not found: ${paymentId}`);
    this.name = 'ReceiptPaymentNotFoundError';
  }
}

export class ReversedPaymentError extends Error {
  constructor(paymentId: string) {
    super(`Rent payment ${paymentId} has been reversed and cannot be receipted.`);
    this.name = 'ReversedPaymentError';
  }
}

export class ReceiptContextIncompleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReceiptContextIncompleteError';
  }
}

export class ReceiptNotFoundError extends Error {
  constructor(receiptId: string) {
    super(`Receipt not found: ${receiptId}`);
    this.name = 'ReceiptNotFoundError';
  }
}

export class ReceiptDocumentMissingError extends Error {
  constructor(receiptId: string) {
    super(`Receipt document is missing or unreadable: ${receiptId}`);
    this.name = 'ReceiptDocumentMissingError';
  }
}

export class ReceiptDocumentCreationError extends Error {
  constructor() {
    super('The receipt PDF could not be rendered or stored.');
    this.name = 'ReceiptDocumentCreationError';
  }
}

export class ReceiptSharingUnavailableError extends Error {
  constructor() {
    super('Sharing is not available on this device.');
    this.name = 'ReceiptSharingUnavailableError';
  }
}

export class InvalidReceiptNumberStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidReceiptNumberStateError';
  }
}