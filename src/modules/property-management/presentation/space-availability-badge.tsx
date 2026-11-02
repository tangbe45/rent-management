import { StyleSheet, Text } from 'react-native';

import { useTranslation, type TranslationKey } from '../../../shared/i18n';
import { palette } from '../../account/presentation/setup/setup-ui';
import type { SpaceAvailability } from '../application/property-space-availability';

const LABEL_KEYS: Record<SpaceAvailability, TranslationKey> = {
  OCCUPIED: 'workspace.status.OCCUPIED',
  UPCOMING: 'workspace.status.UPCOMING',
  AVAILABLE: 'workspace.status.AVAILABLE',
  NOT_RENTABLE: 'workspace.status.NOT_RENTABLE',
  ARCHIVED: 'workspace.status.ARCHIVED',
  SUSPENDED: 'workspace.status.SUSPENDED',
};

export function spaceAvailabilityLabelKey(label: SpaceAvailability): TranslationKey {
  return LABEL_KEYS[label];
}

/**
 * Read-only indicator of whether a space can currently receive a new rental
 * agreement. Archived and suspended spaces use a flat, dashed treatment so they
 * are visually distinguishable from the four standard occupancy labels.
 */
export function SpaceAvailabilityBadge({ label }: { label: SpaceAvailability }) {
  const { t } = useTranslation();
  const isLifecycle = label === 'ARCHIVED' || label === 'SUSPENDED';
  return (
    <Text
      accessibilityLabel={t(LABEL_KEYS[label])}
      style={[
        badgeStyles.badge,
        isLifecycle
          ? badgeStyles.lifecycle
          : label === 'AVAILABLE'
            ? badgeStyles.available
            : label === 'OCCUPIED'
              ? badgeStyles.occupied
              : badgeStyles.neutral,
      ]}
    >
      {t(LABEL_KEYS[label])}
    </Text>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  available: {
    borderColor: palette.primary,
    color: palette.primary,
  },
  occupied: {
    borderColor: palette.danger,
    color: palette.danger,
  },
  neutral: {
    borderColor: palette.border,
    color: palette.textMuted,
  },
  lifecycle: {
    borderStyle: 'dashed',
    borderColor: palette.textMuted,
    backgroundColor: palette.background,
    color: palette.textMuted,
  },
});
