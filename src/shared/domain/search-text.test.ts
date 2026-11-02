import {
  buildSearchableText,
  normalizeSearchText,
  SEARCH_FIELD_SEPARATOR,
  SEARCH_TEXT_FOLDS,
} from './search-text';

describe('normalizeSearchText', () => {
  it('folds diacritics and case into the base ASCII letters', () => {
    expect(normalizeSearchText('Élodie')).toBe('elodie');
    expect(normalizeSearchText('élodie')).toBe('elodie');
    expect(normalizeSearchText('ELODIE')).toBe('elodie');
    expect(normalizeSearchText('François')).toBe('francois');
    expect(normalizeSearchText('Côte')).toBe('cote');
    expect(normalizeSearchText('Ç')).toBe('c');
    expect(normalizeSearchText('ÀÔÊÈ')).toBe('aoee');
  });

  it('folds ligatures and letters without a canonical decomposition', () => {
    expect(normalizeSearchText('Sœur')).toBe('soeur');
    expect(normalizeSearchText('Straße')).toBe('strasse');
    expect(normalizeSearchText('Æther')).toBe('aether');
    expect(normalizeSearchText('Łukasz')).toBe('lukasz');
  });

  it('lower-cases ASCII only, matching SQLite LOWER()', () => {
    // Both the JavaScript and SQL representations must agree for every input,
    // and SQLite's LOWER() does not fold non-ASCII letters.
    expect(normalizeSearchText('Нина')).toBe('Нина');
    expect(normalizeSearchText('amina@example.com')).toBe('amina@example.com');
    expect(normalizeSearchText("100% a_b \\")).toBe("100% a_b \\");
  });

  it('is idempotent', () => {
    for (const value of ['Élodie', 'François Côte', 'Sœur Straße', 'Нина']) {
      expect(normalizeSearchText(normalizeSearchText(value))).toBe(normalizeSearchText(value));
    }
  });

  it('never maps a value into another fold key', () => {
    const keys = new Set(SEARCH_TEXT_FOLDS.map(([from]) => from));
    for (const [, to] of SEARCH_TEXT_FOLDS) {
      expect([...to].some((character) => keys.has(character))).toBe(false);
    }
  });
});

describe('buildSearchableText', () => {
  it('normalizes every field and joins them with the field separator', () => {
    const text = buildSearchableText(['Élodie Durand', '0700', null, 'elodie@example.com']);

    expect(text).toBe(
      ['elodie durand', '0700', '', 'elodie@example.com'].join(SEARCH_FIELD_SEPARATOR),
    );
  });

  it('matches a normalized term across the combined fields', () => {
    expect(buildSearchableText(['Élodie', 'François', null, null])).toContain('francois');
  });
});
