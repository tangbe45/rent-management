/**
 * Presentation helpers for money. Amounts are stored as integer minor units
 * (for example cents). The MVP has a single implicit currency and no currency
 * column, so these helpers format a plain decimal amount without a symbol and
 * parse a decimal string back into minor units without floating-point drift.
 */
const MAJOR_PATTERN = /^\d+(?:[.,]\d{0,2})?$/;

export function formatMinorUnits(minorUnits: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

/** Parses a user-entered decimal amount into integer minor units, or `null`. */
export function parseMajorToMinor(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!MAJOR_PATTERN.test(normalized)) {
    return null;
  }
  const [whole, fraction = ''] = normalized.split('.');
  const minorUnits = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minorUnits) ? minorUnits : null;
}

/** Renders integer minor units back into a plain editable decimal string. */
export function minorToEditable(majorValue: number | null): string {
  if (majorValue === null) {
    return '';
  }
  return (majorValue / 100).toFixed(2);
}

/**
 * Formats integer minor units as a CFA franc amount with no decimals and a
 * trailing "FCFA" unit (for example `25000` -> `250 FCFA`). CFA francs are not
 * subdivided in practice, so the minor-unit convention is kept for storage only.
 */
export function formatFcfaAmount(minorUnits: number, locale: string): string {
  const majorValue = minorUnits / 100;
  const grouped = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(majorValue);
  return `${grouped} FCFA`;
}

/**
 * Formats integer minor units for a read-only display. Exact whole CFA franc
 * amounts use the canonical `formatFcfaAmount` convention (`1,000 FCFA`).
 *
 * The editable inputs still accept fractional amounts while explicit
 * fractional-FCFA validation is a separate task, so a value that carries
 * fractional centimes falls back to the exact `formatMinorUnits` decimal. This
 * keeps the displayed amount truthful: `formatFcfaAmount` alone would silently
 * round such a value (for example `1000.50` to `1001 FCFA`), which would be a
 * misleading display of a stored amount.
 */
export function formatDisplayAmount(minorUnits: number, locale: string): string {
  return minorUnits % 100 === 0
    ? formatFcfaAmount(minorUnits, locale)
    : formatMinorUnits(minorUnits, locale);
}
