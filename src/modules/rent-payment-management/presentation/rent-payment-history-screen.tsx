import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { formatDisplayAmount } from '../../../shared/presentation/money';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { palette, Card, spacing, styles } from '../../account/presentation/setup/setup-ui';
import { getTenant } from '../../tenant-management/infrastructure/composition-root';
import { getRentalAgreement } from '../../rental-agreement-management/infrastructure/composition-root';
import { PAYMENT_METHODS, type PaymentMethod } from '../domain/payment';
import type { RentPaymentListRow } from '../application/list-rent-payments';
import { listRentPayments } from '../infrastructure/composition-root';
import { methodLabel, RentMessage, TextLink } from './rent-ui';

interface HistoryRow extends RentPaymentListRow {
  tenantName: string | null;
}

function loadRows(): HistoryRow[] {
  return listRentPayments.execute().map((row) => {
    const agreement = getRentalAgreement.execute(row.payment.agreementId);
    const tenant = agreement === null ? null : getTenant.execute({ id: agreement.tenantId });
    return { ...row, tenantName: tenant?.fullName ?? null };
  });
}

/**
 * Payment history: every recorded payment, newest first, searchable by tenant
 * name and filterable by method. Reversed payments stay in the list but are
 * clearly flagged.
 */
export function RentPaymentHistoryScreen() {
  const { t, locale } = useTranslation();
  const [rows, setRows] = useState<HistoryRow[]>(loadRows);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState<PaymentMethod | 'ALL'>('ALL');

  const reload = useCallback(() => setRows(loadRows()), []);

  useFocusEffect(reload);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesTenant = query.length === 0 || (row.tenantName ?? '').toLowerCase().includes(query);
      const matchesMethod = method === 'ALL' || row.payment.method === method;
      return matchesTenant && matchesMethod;
    });
  }, [rows, search, method]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={rentStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{`${conceptEmoji.rent} ${t('rent.history.title')}`}</Text>

      <Card>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('rent.history.searchPlaceholder')}
          accessibilityLabel={t('rent.history.searchPlaceholder')}
          style={styles.input}
        />
        <View style={rentStyles.methods}>
          {(['ALL', ...PAYMENT_METHODS] as const).map((candidate) => (
            <Pressable
              key={candidate}
              onPress={() => setMethod(candidate)}
              accessibilityRole="button"
              accessibilityLabel={candidate === 'ALL' ? t('rent.history.title') : methodLabel(t, candidate)}
              style={[rentStyles.method, candidate === method ? rentStyles.methodSelected : null]}
            >
              <Text
                style={candidate === method ? rentStyles.methodTextSelected : rentStyles.methodText}
              >
                {candidate === 'ALL' ? t('rent.history.title') : methodLabel(t, candidate)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {filtered.length === 0 ? (
        <RentMessage
          title={t('rent.history.empty')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      ) : (
        filtered.map((row) => (
          <Pressable
            key={row.payment.id}
            onPress={() => router.push(`/rent/payments/${row.payment.id}`)}
            accessibilityRole="button"
            accessibilityLabel={t('rent.action.viewPayment')}
            style={({ pressed }) => (pressed ? rentStyles.pressed : undefined)}
          >
            <Card>
              <View style={rentStyles.row}>
                <Text style={rentStyles.value}>{row.tenantName ?? t('rent.payment.none')}</Text>
                <Text style={rentStyles.totalValue}>
                  {formatDisplayAmount(row.payment.amount, locale)}
                </Text>
              </View>
              <Text style={rentStyles.muted}>
                {`${row.payment.paymentDate} · ${methodLabel(t, row.payment.method)}${
                  row.reversed ? ` · ${t('rent.paymentHistory.reversed')}` : ''
                }`}
              </Text>
            </Card>
          </Pressable>
        ))
      )}

      <TextLink title={t('common.back')} onPress={() => router.back()} />
    </ScrollView>
  );
}

const rentStyles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.xl,
    gap: spacing.l,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  value: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '600',
    color: palette.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  muted: {
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.7,
  },
  methods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  method: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: palette.background,
  },
  methodSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  methodText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  methodTextSelected: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
