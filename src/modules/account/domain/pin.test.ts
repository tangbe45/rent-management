import { Pin } from './pin';

describe('Pin', () => {
  it.each(['0000', '1234', '9999'])('accepts digit pin "%s"', (value) => {
    expect(Pin.create(value).value).toBe(value);
  });

  it.each(['123', '12345', '12x4', '', '  12  '])('rejects malformed pin "%s"', (value) => {
    expect(() => Pin.create(value)).toThrow(/exactly 4 digits/);
  });
});