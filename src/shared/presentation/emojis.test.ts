import { conceptEmoji } from './emojis';

describe('conceptEmoji', () => {
  it('maps every concept to a distinct, non-empty emoji', () => {
    const emojis = Object.values(conceptEmoji);

    expect(emojis.every((emoji) => emoji.length > 0)).toBe(true);
    expect(new Set(emojis).size).toBe(emojis.length);
  });
});
