import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation, type TranslationKey } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { formatDisplayAmount } from '../../../shared/presentation/money';
import {
  Card,
  KeyboardSafeContainer,
  palette,
  PrimaryButton,
  spacing,
  styles,
} from '../../account/presentation/setup/setup-ui';
import type { RentalAgreementListItem } from '../application/list-rental-agreements';
import type { RentalAgreementLifecycle } from '../domain/rental-agreement';
import { SecondaryButton } from './agreement-ui';

export type AgreementLifecycleFilter = RentalAgreementLifecycle | 'ALL';

const LIFECYCLE_FILTERS: readonly AgreementLifecycleFilter[] = [
  'ALL',
  'UPCOMING',
  'ACTIVE',
  'ENDED',
  'TERMINATED',
];

interface AgreementListProps {
  items: readonly RentalAgreementListItem[];
  total: number;
  lifecycleFilter: AgreementLifecycleFilter;
  onLifecycleFilterChange: (filter: AgreementLifecycleFilter) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onLoadMore: () => void;
}

export function AgreementList({
  items,
  total,
  lifecycleFilter,
  onLifecycleFilterChange,
  onOpen,
  onCreate,
  onLoadMore,
}: AgreementListProps) {
  const { t, locale } = useTranslation();

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>{`${conceptEmoji.agreements} ${t('agreements.list.title')}`}</Text>

      <Text style={listStyles.filterLabel}>{t('agreements.list.filter')}</Text>
      <View style={listStyles.filters}>
        {LIFECYCLE_FILTERS.map((filter) => {
          const selected = filter === lifecycleFilter;
          const label =
            filter === 'ALL'
              ? t('agreements.list.filter.all')
              : t(`agreements.lifecycle.${filter}` as TranslationKey);
          return (
            <Pressable
              key={filter}
              onPress={() => onLifecycleFilterChange(filter)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              style={[listStyles.filter, selected ? listStyles.filterSelected : null]}
            >
              <Text style={selected ? listStyles.filterTextSelected : listStyles.filterText}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {items.length === 0 ? (
        <Text style={styles.subtitle}>{t('agreements.list.empty')}</Text>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.agreement.id}
            onPress={() => onOpen(item.agreement.id)}
            accessibilityRole="button"
            accessibilityLabel={item.tenantName ?? item.agreement.id}
            style={({ pressed }) => (pressed ? listStyles.pressed : undefined)}
          >
            <Card>
              <View style={listStyles.header}>
                <Text style={listStyles.name}>{item.tenantName ?? t('agreements.details.none')}</Text>
                <Text style={listStyles.badge}>
                  {t(`agreements.lifecycle.${item.lifecycle}` as TranslationKey)}
                </Text>
              </View>
              <Text style={listStyles.detail}>
                {[item.propertyName, item.spaceName].filter(Boolean).join(' · ')}
              </Text>
              <Text style={listStyles.detail}>
                {item.agreement.endDate === null
                  ? item.agreement.startDate
                  : `${item.agreement.startDate} – ${item.agreement.endDate}`}
              </Text>
              <Text style={listStyles.rent}>
                {`${formatDisplayAmount(item.agreement.rentAmount, locale)} · ${t(
                  `agreements.frequency.${item.agreement.rentFrequency}` as TranslationKey,
                )}`}
              </Text>
            </Card>
          </Pressable>
        ))
      )}

      {items.length < total ? (
        <SecondaryButton title={t('agreements.list.loadMore')} onPress={onLoadMore} />
      ) : null}

      <PrimaryButton title={t('agreements.list.add')} onPress={onCreate} />
    </KeyboardSafeContainer>
  );
}

const listStyles = StyleSheet.create({
  filterLabel: {
    fontSize: 14,
    color: palette.text,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  filter: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 999,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    backgroundColor: palette.background,
  },
  filterSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  filterText: {
    fontSize: 14,
    color: palette.text,
  },
  filterTextSelected: {
    fontSize: 14,
    color: palette.primary,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  name: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.primary,
  },
  detail: {
    fontSize: 15,
    color: palette.textMuted,
  },
  rent: {
    fontSize: 15,
    color: palette.text,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});
