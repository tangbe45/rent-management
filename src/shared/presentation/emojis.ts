/**
 * Presentation-only emojis shared across screens. They identify a screen,
 * feature or entity at a glance and are never stored in the domain, the
 * database or translation catalogues (so presentation never depends on the
 * active locale). Entity-type emojis live with their module (see
 * `property-management/presentation/space-emoji.ts`).
 */
export const conceptEmoji = {
  welcome: '👋',
  account: '👤',
  security: '🔐',
  dashboard: '🏡',
  properties: '🏠',
  tenants: '🧑',
  agreements: '📄',
  spaces: '🏢',
  tree: '🌳',
  archived: '🗄️',
  subscription: '⭐',
  rent: '💰',
  receipts: '🧾',
  settings: '⚙️',
} as const;
