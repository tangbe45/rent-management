import { en } from './locales/en';
import { fr } from './locales/fr';
import { getLocale, setLocale, t, translate } from './index';

afterEach(() => {
  setLocale('en');
});

describe('i18n catalogues', () => {
  it('exposes the same translation keys in English and French', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });

  it('provides non-empty French translations for every key', () => {
    for (const value of Object.values(fr)) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('translate', () => {
  it('returns the string for the requested locale', () => {
    expect(translate('en', 'properties.list.title')).toBe('Properties');
    expect(translate('fr', 'properties.list.title')).toBe('Biens');
  });

  it('interpolates named parameters', () => {
    expect(translate('en', 'properties.details.archivedAt')).toBe('Archived');
  });
});

describe('active locale', () => {
  it('defaults to a valid locale and switches with setLocale', () => {
    expect(['en', 'fr']).toContain(getLocale());

    setLocale('fr');
    expect(t('properties.list.title')).toBe('Biens');

    setLocale('en');
    expect(t('properties.list.title')).toBe('Properties');
  });

  it('ignores redundant locale changes', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
  });
});