import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import {
  Card,
  KeyboardSafeContainer,
  palette,
  PrimaryButton,
  styles,
} from '../../account/presentation/setup/setup-ui';
import type { Tenant } from '../domain/tenant';
import { SecondaryButton, TextLink } from './tenant-ui';

interface TenantListProps {
  tenants: readonly Tenant[];
  total: number;
  /** True once the first read has completed, so no empty state flashes before it. */
  loaded: boolean;
  search: string;
  error?: string;
  onSearchChange: (value: string) => void;
  onLoadMore: () => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onOpenArchived: () => void;
}

export function TenantList({
  tenants,
  total,
  loaded,
  search,
  error,
  onSearchChange,
  onLoadMore,
  onCreate,
  onOpen,
  onOpenArchived,
}: TenantListProps) {
  const { t } = useTranslation();
  /**
   * A failed first read must show only the error: rendering "No tenants yet."
   * next to it would wrongly imply the list is empty.
   */
  const emptyMessage =
    tenants.length > 0 || !loaded || error ? null : t('tenants.list.empty');

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>{`${conceptEmoji.tenants} ${t('tenants.list.title')}`}</Text>

      <TextInput
        value={search}
        onChangeText={onSearchChange}
        placeholder={t('tenants.list.search')}
        accessibilityLabel={t('tenants.list.search')}
        style={styles.input}
      />

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      {tenants.length > 0 ? (
        tenants.map((tenant) => (
          <Pressable
            key={tenant.id}
            onPress={() => onOpen(tenant.id)}
            accessibilityRole="button"
            accessibilityLabel={tenant.fullName}
            style={({ pressed }) => (pressed ? listStyles.pressed : undefined)}
          >
            <Card>
              <Text style={listStyles.name}>{tenant.fullName}</Text>
              {tenant.phone !== null ? <Text style={listStyles.detail}>{tenant.phone}</Text> : null}
              {tenant.email !== null ? (
                <Text style={listStyles.detail}>{tenant.email}</Text>
              ) : null}
            </Card>
          </Pressable>
        ))
      ) : emptyMessage !== null ? (
        <Text style={styles.subtitle}>{emptyMessage}</Text>
      ) : null}

      {tenants.length < total ? (
        <SecondaryButton title={t('tenants.list.loadMore')} onPress={onLoadMore} />
      ) : null}

      <PrimaryButton title={t('tenants.list.add')} onPress={onCreate} />
      <TextLink title={t('tenants.list.openArchived')} onPress={onOpenArchived} />
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
  pressed: {
    opacity: 0.75,
  },
});
