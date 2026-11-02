import { useSyncExternalStore } from 'react';

import { en, type TranslationKey } from './locales/en';
import { fr } from './locales/fr';

export type Locale = 'en' | 'fr';
export type { TranslationKey };

const catalogues: Record<Locale, Record<TranslationKey, string>> = { en, fr };

export function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'fr';
}

/**
 * Best-effort device language detection. The application ships English and
 * French; anything else falls back to English. No native locale module is used
 * (none is installed), so this relies on the platform `Intl` implementation.
 */
function detectLocale(): Locale {
  try {
    const resolved = new Intl.DateTimeFormat().resolvedOptions().locale;
    const language = resolved.split('-')[0]?.toLowerCase();
    return language === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

let currentLocale: Locale = detectLocale();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) {
    return;
  }
  currentLocale = locale;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  return interpolate(catalogues[locale][key], params);
}

/**
 * Narrows an arbitrary string (for example one assembled from a stored value
 * such as a payment method) to a known translation key. Used where a value is
 * only sometimes one of the enumerated keys and the raw value is the fallback.
 */
export function hasTranslationKey(key: string): key is TranslationKey {
  return Object.prototype.hasOwnProperty.call(en, key);
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return translate(currentLocale, key, params);
}

/**
 * React binding for translations: re-renders the calling component when the
 * active locale changes. Presentation components must use this rather than
 * hard-coding user-visible strings.
 */
export function useTranslation(): { t: typeof t; locale: Locale } {
  const locale = useSyncExternalStore(subscribe, getLocale, getLocale);
  return { t, locale };
}