import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import {
  Card,
  KeyboardSafeContainer,
  PrimaryButton,
  palette,
  spacing,
  styles,
} from '../../account/presentation/setup/setup-ui';
import type { PropertySpace } from '../domain/property-space';
import { formatTimestamp, SecondaryButton, TextLink } from './property-ui';
import { spaceTypeEmoji, spaceTypeLabelKey } from './space-emoji';

interface SpaceDetailsProps {
  space: PropertySpace;
  parentName: string | null;
  childrenNames: readonly string[];
  error?: string;
  onEdit: () => void;
  onAddChild: () => void;
  onCreateAgreement: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onBack: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailsStyles.row}>
      <Text style={detailsStyles.label}>{label}</Text>
      <Text style={detailsStyles.value}>{value}</Text>
    </View>
  );
}

export function SpaceDetails({
  space,
  parentName,
  childrenNames,
  error,
  onEdit,
  onAddChild,
  onCreateAgreement,
  onArchive,
  onRestore,
  onBack,
}: SpaceDetailsProps) {
  const { t, locale } = useTranslation();

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>{`${conceptEmoji.spaces} ${t('spaces.details.title')}`}</Text>
      <Card>
        <View style={detailsStyles.header}>
          <Text style={detailsStyles.emoji}>{spaceTypeEmoji(space.type)}</Text>
          <Text style={detailsStyles.name}>{space.name}</Text>
          {space.isArchived ? (
            <Text style={detailsStyles.badge}>{t('spaces.badge.archived')}</Text>
          ) : null}
        </View>

        <DetailRow label={t('spaces.details.type')} value={t(spaceTypeLabelKey(space.type))} />
        <DetailRow
          label={t('spaces.details.rentable')}
          value={space.rentable ? t('spaces.rentable') : t('spaces.notRentable')}
        />
        <DetailRow
          label={t('spaces.details.parent')}
          value={parentName ?? t('spaces.details.root')}
        />
        <DetailRow
          label={t('spaces.details.children')}
          value={childrenNames.length === 0 ? t('spaces.details.none') : childrenNames.join(', ')}
        />
        <DetailRow
          label={t('spaces.details.createdAt')}
          value={formatTimestamp(space.createdAt, locale)}
        />
        <DetailRow
          label={t('spaces.details.updatedAt')}
          value={formatTimestamp(space.updatedAt, locale)}
        />
        {space.archivedAt !== null ? (
          <DetailRow
            label={t('spaces.details.archivedAt')}
            value={formatTimestamp(space.archivedAt, locale)}
          />
        ) : null}

        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        <PrimaryButton title={t('spaces.action.edit')} onPress={onEdit} />
        {space.rentable && !space.isArchived ? (
          <SecondaryButton
            title={t('spaces.action.createAgreement')}
            onPress={onCreateAgreement}
          />
        ) : null}
        {space.isActive ? (
          <SecondaryButton title={t('spaces.action.addChild')} onPress={onAddChild} />
        ) : null}
        {space.isArchived ? (
          <SecondaryButton title={t('spaces.action.restore')} onPress={onRestore} />
        ) : (
          <SecondaryButton title={t('spaces.action.archive')} onPress={onArchive} />
        )}
      </Card>
      <TextLink title={t('common.back')} onPress={onBack} />
    </KeyboardSafeContainer>
  );
}

const detailsStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  emoji: {
    fontSize: 24,
  },
  name: {
    flexShrink: 1,
    flexGrow: 1,
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.danger,
    borderWidth: 1,
    borderColor: palette.danger,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.textMuted,
  },
  value: {
    fontSize: 16,
    color: palette.text,
  },
});