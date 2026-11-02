import { PROPERTY_SPACE_TYPES } from '../domain/property-space';
import { spaceTypeEmoji, spaceTypeLabelKey } from './space-emoji';

describe('space-emoji', () => {
  it('maps every controlled type to a distinct, non-empty emoji', () => {
    const emojis = PROPERTY_SPACE_TYPES.map(spaceTypeEmoji);

    expect(emojis.every((emoji) => emoji.length > 0)).toBe(true);
    expect(new Set(emojis).size).toBe(PROPERTY_SPACE_TYPES.length);
  });

  it('exposes a translation key per type', () => {
    expect(spaceTypeLabelKey('BUILDING')).toBe('spaces.type.BUILDING');
    expect(spaceTypeLabelKey('APARTMENT')).toBe('spaces.type.APARTMENT');
    expect(spaceTypeLabelKey('WAREHOUSE')).toBe('spaces.type.WAREHOUSE');
  });
});