import { StyleSheet, Text } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import {
  Card,
  KeyboardSafeContainer,
  palette,
  styles,
} from '../../account/presentation/setup/setup-ui';
import type { Tenant } from '../domain/tenant';
import { SecondaryButton, TextLink } from './tenant-ui';

interface ArchivedTenantListProps {
  tenants: readonly Tenant[];
  onOpen: (id: string) => void;
  onRestore: (id: string) => void;
  onBack: () => void;
}

export function ArchivedTenantList({
  tenants,
  onOpen,
  onRestore,
  onBack,
}: ArchivedTenantListProps) {
  const { t } = useTranslation();

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>
        {`${conceptEmoji.tenants} ${t('tenants.archived.title')}`}
      </Text>
      {tenants.length === 0 ? (
        <Text style={styles.subtitle}>{t('tenants.archived.empty')}</Text>
      ) : (
        tenants.map((tenant) => (
          <Card key={tenant.id}>
            <Text style={listStyles.name}>{tenant.fullName}</Text>
            {tenant.phone !== null ? (
              <Text style={listStyles.detail}>{tenant.phone}</Text>
            ) : null}
            <SecondaryButton
              title={t('tenants.action.open')}
              onPress={() => onOpen(tenant.id)}
            />
            <SecondaryButton
              title={t('tenants.action.restore')}
              onPress={() => onRestore(tenant.id)}
            />
          </Card>
        ))
      )}
      <TextLink title={t('common.back')} onPress={onBack} />
    </KeyboardSafeContainer>
  );
}

const listStyles = StyleSheet.create({
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  detail: {
    fontSize: 15,
    color: palette.textMuted,
  },
});
