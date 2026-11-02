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
import type { Property } from '../domain/property';
import { formatTimestamp, SecondaryButton, TextLink } from './property-ui';

interface PropertyDetailsProps {
  property: Property;
  error?: string;
  onEdit: () => void;
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

export function PropertyDetails({
  property,
  error,
  onEdit,
  onArchive,
  onRestore,
  onBack,
}: PropertyDetailsProps) {
  const { t, locale } = useTranslation();

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>{`${conceptEmoji.properties} ${t('properties.details.title')}`}</Text>
      <Card>
        <View style={detailsStyles.header}>
          <Text style={detailsStyles.name}>{property.name}</Text>
          {property.isArchived ? (
            <Text style={detailsStyles.badge}>{t('properties.badge.archived')}</Text>
          ) : null}
        </View>

        <DetailRow label={t('properties.form.address')} value={property.address} />
        {property.description !== null ? (
          <DetailRow label={t('properties.form.description')} value={property.description} />
        ) : null}
        <DetailRow
          label={t('properties.details.createdAt')}
          value={formatTimestamp(property.createdAt, locale)}
        />
        <DetailRow
          label={t('properties.details.updatedAt')}
          value={formatTimestamp(property.updatedAt, locale)}
        />
        {property.archivedAt !== null ? (
          <DetailRow
            label={t('properties.details.archivedAt')}
            value={formatTimestamp(property.archivedAt, locale)}
          />
        ) : null}

        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        <PrimaryButton title={t('properties.action.edit')} onPress={onEdit} />
        {property.isArchived ? (
          <SecondaryButton title={t('properties.action.restore')} onPress={onRestore} />
        ) : (
          <SecondaryButton title={t('properties.action.archive')} onPress={onArchive} />
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
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  name: {
    flexShrink: 1,
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