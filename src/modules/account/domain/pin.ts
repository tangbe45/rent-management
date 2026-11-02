export const PIN_LENGTH = 4;

const PIN_PATTERN = /^\d{4}$/;

export class Pin {
  private constructor(readonly value: string) {}

  static create(value: string): Pin {
    if (!PIN_PATTERN.test(value)) {
      throw new InvalidPinError(`PIN must be exactly ${PIN_LENGTH} digits.`);
    }
    return new Pin(value);
  }
}

export class InvalidPinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPinError';
  }
}