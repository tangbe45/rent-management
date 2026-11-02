import { StyleSheet, Text, TextInput } from 'react-native';

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
  /** Archived tenants matching the current search; the unpaginated total. */
  total: number;
  /** Archived tenants ignoring the search, used to separate the empty states. */
  archivedTotal: number;
  /** True once the first read has completed, so no empty state flashes before it. */
  loaded: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onLoadMore: () => void;
  error?: string;
  onOpen: (id: string) => void;
  onRestore: (id: string) => void;
  onBack: () => void;
}

export function ArchivedTenantList({
  tenants,
  total,
  archivedTotal,
  loaded,
  search,
  onSearchChange,
  onLoadMore,
  error,
  onOpen,
  onRestore,
  onBack,
}: ArchivedTenantListProps) {
  const { t } = useTranslation();
  const hasResults = tenants.length > 0;
  /**
   * A failed first read must show only the error: rendering "No archived
   * tenants" next to it would wrongly imply the archive is empty.
   */
  const emptyMessage =
    hasResults || !loaded || error
      ? null
      : archivedTotal === 0
        ? t('tenants.archived.empty')
        : t('tenants.archived.noResults');

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>
        {`${conceptEmoji.tenants} ${t('tenants.archived.title')}`}
      </Text>

      <TextInput
        value={search}
        onChangeText={onSearchChange}
        placeholder={t('tenants.archived.search')}
        accessibilityLabel={t('tenants.archived.search')}
        style={styles.input}
      />

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      {hasResults ? (
        <>
          <Text style={styles.subtitle}>
            {total === 1
              ? t('tenants.archived.resultCountOne')
              : t('tenants.archived.resultCountMany', { count: total })}
          </Text>
          {tenants.map((tenant) => (
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
          ))}
        </>
      ) : emptyMessage !== null ? (
        <Text style={styles.subtitle}>{emptyMessage}</Text>
      ) : null}

      {hasResults && tenants.length < total ? (
        <SecondaryButton title={t('tenants.list.loadMore')} onPress={onLoadMore} />
      ) : null}

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
