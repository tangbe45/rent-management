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
import type { Tenant } from '../domain/tenant';
import { SecondaryButton, TextLink, formatTimestamp } from './tenant-ui';

interface TenantDetailsProps {
  tenant: Tenant;
  error?: string;
  onEdit: () => void;
  onCreateAgreement: () => void;
  onOpenRent?: () => void;
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

export function TenantDetails({
  tenant,
  error,
  onEdit,
  onCreateAgreement,
  onOpenRent,
  onArchive,
  onRestore,
  onBack,
}: TenantDetailsProps) {
  const { t, locale } = useTranslation();

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>{`${conceptEmoji.tenants} ${t('tenants.details.title')}`}</Text>
      <Card>
        <View style={detailsStyles.header}>
          <Text style={detailsStyles.name}>{tenant.fullName}</Text>
          {tenant.isArchived ? (
            <Text style={detailsStyles.badge}>{t('tenants.badge.archived')}</Text>
          ) : null}
        </View>

        {tenant.phone !== null ? (
          <DetailRow label={t('tenants.form.phone')} value={tenant.phone} />
        ) : null}
        {tenant.secondPhoneNumber !== null ? (
          <DetailRow label={t('tenants.form.secondPhoneNumber')} value={tenant.secondPhoneNumber} />
        ) : null}
        {tenant.email !== null ? (
          <DetailRow label={t('tenants.form.email')} value={tenant.email} />
        ) : null}
        {tenant.nationalIdCardNumber !== null ? (
          <DetailRow label={t('tenants.form.nationalId')} value={tenant.nationalIdCardNumber} />
        ) : null}
        {tenant.notes !== null ? (
          <DetailRow label={t('tenants.form.notes')} value={tenant.notes} />
        ) : null}
        <DetailRow
          label={t('tenants.details.createdAt')}
          value={formatTimestamp(tenant.createdAt, locale)}
        />
        <DetailRow
          label={t('tenants.details.updatedAt')}
          value={formatTimestamp(tenant.updatedAt, locale)}
        />
        {tenant.archivedAt !== null ? (
          <DetailRow
            label={t('tenants.details.archivedAt')}
            value={formatTimestamp(tenant.archivedAt, locale)}
          />
        ) : null}

        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        <PrimaryButton title={t('tenants.action.edit')} onPress={onEdit} />
        {onOpenRent ? (
          <SecondaryButton title={t('rent.tenant.title')} onPress={onOpenRent} />
        ) : null}
        <SecondaryButton
          title={t('tenants.action.createAgreement')}
          onPress={onCreateAgreement}
        />
        {tenant.isArchived ? (
          <SecondaryButton title={t('tenants.action.restore')} onPress={onRestore} />
        ) : (
          <SecondaryButton title={t('tenants.action.archive')} onPress={onArchive} />
        )}
      </Card>
      <TextLink title={t('common.back')} onPress={onBack} />
    </KeyboardSafeContainer>
  );
}

const detailsStyles = StyleSheet.create({
  row: {
    gap: spacing.xs,
  },
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
    color: palette.textMuted,
  },
  label: {
    fontSize: 14,
    color: palette.text,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: palette.text,
  },
});
