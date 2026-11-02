import type { TranslationKey } from '../../../shared/i18n';
import type { PropertySpaceType } from '../domain/property-space';

/**
 * Presentation-only mapping from a space type to its emoji. Emojis are never
 * stored in the domain or the database; they only improve scanning in the UI.
 */
const SPACE_TYPE_EMOJI: Record<PropertySpaceType, string> = {
  BUILDING: '🏢',
  FLOOR: '🪜',
  APARTMENT: '🏠',
  STUDIO: '🏡',
  ROOM: '🚪',
  SHOP: '🛍️',
  OFFICE: '💼',
  WAREHOUSE: '📦',
  OTHER: '📍',
};

export function spaceTypeEmoji(type: PropertySpaceType): string {
  return SPACE_TYPE_EMOJI[type];
}

/** Translation key giving the human-readable label of a space type. */
export function spaceTypeLabelKey(type: PropertySpaceType): TranslationKey {
  return `spaces.type.${type}`;
}