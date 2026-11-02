import { en } from './src/shared/i18n/locales/en';
import { fr } from './src/shared/i18n/locales/fr';

describe('More tab localization keys', () => {
  const required = [
    'more.title',
    'more.reports',
    'more.security',
    'more.backup',
    'more.subscription',
    'common.comingSoon',
    'agreements.openList',
    'rent.openDashboard',
    'receipts.openList',
    'settings.openSettings',
  ] as const;

  for (const key of required) {
    it(`has ${key} in English`, () => {
      expect(Object.prototype.hasOwnProperty.call(en, key)).toBe(true);
    });
    it(`has ${key} in French`, () => {
      expect(Object.prototype.hasOwnProperty.call(fr, key)).toBe(true);
    });
  }
});
