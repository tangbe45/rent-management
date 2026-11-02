/**
 * Shared text normalization for tenant search.
 *
 * SQLite's `LIKE`, `LOWER()` and `COLLATE NOCASE` only fold ASCII characters
 * (verified against the bundled SQLite: `'Élodie' LIKE '%elodie%'` is false and
 * `lower('Élodie')` returns `'Élodie'`). Search therefore needs its own folding
 * table, applied by the in-memory repository in JavaScript and by the Drizzle
 * repository through an equivalent generated SQL expression.
 *
 * `SEARCH_TEXT_FOLDS` is the single source of truth for both: each entry maps
 * one character to the lower-case ASCII form search should see. It covers the
 * Latin-1 Supplement and Latin Extended-A blocks (the accented letters used by
 * Latin-script names) plus the ligatures and letters that Unicode canonical
 * decomposition does not decompose. Replacement values are lower-case ASCII
 * letters only, so they never cascade into another entry.
 */
export const SEARCH_TEXT_FOLDS: readonly (readonly [string, string])[] = [
  ['Æ', 'ae'], ['æ', 'ae'], ['Œ', 'oe'], ['œ', 'oe'],
  ['ß', 'ss'], ['Ø', 'o'], ['ø', 'o'], ['Ð', 'd'],
  ['ð', 'd'], ['Þ', 'th'], ['þ', 'th'], ['Đ', 'd'],
  ['đ', 'd'], ['Ł', 'l'], ['ł', 'l'], ['Ħ', 'h'],
  ['ħ', 'h'], ['Ŋ', 'n'], ['ŋ', 'n'], ['Ŧ', 't'],
  ['ŧ', 't'], ['Ĳ', 'ij'], ['ĳ', 'ij'], ['Ŀ', 'l'],
  ['ŀ', 'l'], ['ı', 'i'], ['À', 'a'], ['Á', 'a'],
  ['Â', 'a'], ['Ã', 'a'], ['Ä', 'a'], ['Å', 'a'],
  ['Ç', 'c'], ['È', 'e'], ['É', 'e'], ['Ê', 'e'],
  ['Ë', 'e'], ['Ì', 'i'], ['Í', 'i'], ['Î', 'i'],
  ['Ï', 'i'], ['Ñ', 'n'], ['Ò', 'o'], ['Ó', 'o'],
  ['Ô', 'o'], ['Õ', 'o'], ['Ö', 'o'], ['Ù', 'u'],
  ['Ú', 'u'], ['Û', 'u'], ['Ü', 'u'], ['Ý', 'y'],
  ['à', 'a'], ['á', 'a'], ['â', 'a'], ['ã', 'a'],
  ['ä', 'a'], ['å', 'a'], ['ç', 'c'], ['è', 'e'],
  ['é', 'e'], ['ê', 'e'], ['ë', 'e'], ['ì', 'i'],
  ['í', 'i'], ['î', 'i'], ['ï', 'i'], ['ñ', 'n'],
  ['ò', 'o'], ['ó', 'o'], ['ô', 'o'], ['õ', 'o'],
  ['ö', 'o'], ['ù', 'u'], ['ú', 'u'], ['û', 'u'],
  ['ü', 'u'], ['ý', 'y'], ['ÿ', 'y'], ['Ā', 'a'],
  ['ā', 'a'], ['Ă', 'a'], ['ă', 'a'], ['Ą', 'a'],
  ['ą', 'a'], ['Ć', 'c'], ['ć', 'c'], ['Ĉ', 'c'],
  ['ĉ', 'c'], ['Ċ', 'c'], ['ċ', 'c'], ['Č', 'c'],
  ['č', 'c'], ['Ď', 'd'], ['ď', 'd'], ['Ē', 'e'],
  ['ē', 'e'], ['Ĕ', 'e'], ['ĕ', 'e'], ['Ė', 'e'],
  ['ė', 'e'], ['Ę', 'e'], ['ę', 'e'], ['Ě', 'e'],
  ['ě', 'e'], ['Ĝ', 'g'], ['ĝ', 'g'], ['Ğ', 'g'],
  ['ğ', 'g'], ['Ġ', 'g'], ['ġ', 'g'], ['Ģ', 'g'],
  ['ģ', 'g'], ['Ĥ', 'h'], ['ĥ', 'h'], ['Ĩ', 'i'],
  ['ĩ', 'i'], ['Ī', 'i'], ['ī', 'i'], ['Ĭ', 'i'],
  ['ĭ', 'i'], ['Į', 'i'], ['į', 'i'], ['İ', 'i'],
  ['Ĵ', 'j'], ['ĵ', 'j'], ['Ķ', 'k'], ['ķ', 'k'],
  ['Ĺ', 'l'], ['ĺ', 'l'], ['Ļ', 'l'], ['ļ', 'l'],
  ['Ľ', 'l'], ['ľ', 'l'], ['Ń', 'n'], ['ń', 'n'],
  ['Ņ', 'n'], ['ņ', 'n'], ['Ň', 'n'], ['ň', 'n'],
  ['Ō', 'o'], ['ō', 'o'], ['Ŏ', 'o'], ['ŏ', 'o'],
  ['Ő', 'o'], ['ő', 'o'], ['Ŕ', 'r'], ['ŕ', 'r'],
  ['Ŗ', 'r'], ['ŗ', 'r'], ['Ř', 'r'], ['ř', 'r'],
  ['Ś', 's'], ['ś', 's'], ['Ŝ', 's'], ['ŝ', 's'],
  ['Ş', 's'], ['ş', 's'], ['Š', 's'], ['š', 's'],
  ['Ţ', 't'], ['ţ', 't'], ['Ť', 't'], ['ť', 't'],
  ['Ũ', 'u'], ['ũ', 'u'], ['Ū', 'u'], ['ū', 'u'],
  ['Ŭ', 'u'], ['ŭ', 'u'], ['Ů', 'u'], ['ů', 'u'],
  ['Ű', 'u'], ['ű', 'u'], ['Ų', 'u'], ['ų', 'u'],
  ['Ŵ', 'w'], ['ŵ', 'w'], ['Ŷ', 'y'], ['ŷ', 'y'],
  ['Ÿ', 'y'], ['Ź', 'z'], ['ź', 'z'], ['Ż', 'z'],
  ['ż', 'z'], ['Ž', 'z'], ['ž', 'z'],
];

const FOLD_BY_CHARACTER = new Map(SEARCH_TEXT_FOLDS);

/**
 * Separates the searchable fields inside the combined search text. U+001F is a
 * non-printing control character no one types, so a term cannot accidentally
 * match across two fields. Keeping one combined representation lets the
 * in-memory and SQL implementations share the exact same haystack shape.
 */
export const SEARCH_FIELD_SEPARATOR_CODE_POINT = 0x1f;
export const SEARCH_FIELD_SEPARATOR = String.fromCodePoint(SEARCH_FIELD_SEPARATOR_CODE_POINT);

/**
 * Folds a single string for search: diacritics become their base letter and
 * ASCII letters are lower-cased. Characters outside the folding table are kept
 * as-is, deliberately matching SQLite's ASCII-only `lower()` so the JavaScript
 * and SQL representations stay identical for every input.
 */
export function normalizeSearchText(value: string): string {
  let normalized = '';
  for (const character of value) {
    normalized += FOLD_BY_CHARACTER.get(character) ?? foldAsciiCase(character);
  }
  return normalized;
}

/**
 * Builds the normalized, separator-joined search text for a record. `null`
 * fields contribute an empty segment, matching the `coalesce(..., '')` used by
 * the SQL expression.
 */
export function buildSearchableText(fields: readonly (string | null)[]): string {
  return fields
    .map((field) => normalizeSearchText(field ?? ''))
    .join(SEARCH_FIELD_SEPARATOR);
}

function foldAsciiCase(character: string): string {
  return character >= 'A' && character <= 'Z' ? character.toLowerCase() : character;
}
