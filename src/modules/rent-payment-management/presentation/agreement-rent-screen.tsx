import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslation, type TranslationKey } from '../../../shared/i18n';
import { formatDisplayAmount } from '../../../shared/presentation/money';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { palette, Card, PrimaryButton, spacing, styles } from '../../account/presentation/setup/setup-ui';
import { getTenant } from '../../tenant-management/infrastructure/composition-root';
import type { RentAgreementSummary } from '../application/get-rent-summary';
import type { RentPaymentListRow } from '../application/list-rent-payments';
import { getRentalAgreement } from '../../rental-agreement-management/infrastructure/composition-root';
import { getAgreementRent, listRentPayments } from '../infrastructure/composition-root';
import { methodLabel, RentMessage, rentUiStyles, statusLabel, TextLink } from './rent-ui';

interface AgreementRentScreenProps {
  agreementId: string;
}

/**
 * One agreement's rent picture: outstanding/overdue/due-now totals, its rent
 * periods with derived status, and its payment history. Recording a payment and
 * opening a payment's details are the only actions here.
 */
export function AgreementRentScreen({ agreementId }: AgreementRentScreenProps) {
  const { t, locale } = useTranslation();
  const [summary, setSummary] = useState<RentAgreementSummary | null>(() =>
    getAgreementRent.execute({ agreementId }),
  );
  const [payments, setPayments] = useState<RentPaymentListRow[]>(() =>
    listRentPayments.execute({ agreementId }),
  );

  const reload = useCallback(() => {
    setSummary(getAgreementRent.execute({ agreementId }));
    setPayments(listRentPayments.execute({ agreementId }));
  }, [agreementId]);

  useFocusEffect(reload);

  if (summary === null) {
    return (
      <RentMessage
        title={t('rent.agreement.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const agreement = getRentalAgreement.execute(agreementId);
  const tenant = agreement === null ? null : getTenant.execute({ id: agreement.tenantId });
  const frequencyLabel = t(
    `agreements.frequency.${summary.agreement.rentFrequency}` as TranslationKey,
  );
  const canRecord = summary.totalOutstanding > 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={rentStyles.content}>
      <Text style={styles.title}>{`${conceptEmoji.rent} ${t('rent.agreement.title')}`}</Text>

      <Card>
        {tenant !== null ? (
          <View style={rentUiStyles.row}>
            <Text style={rentUiStyles.label}>{t('agreements.details.tenant')}</Text>
            <Text style={rentUiStyles.value}>{tenant.fullName}</Text>
          </View>
        ) : null}
        <View style={rentUiStyles.row}>
          <Text style={rentUiStyles.label}>{t('rent.agreement.rentAmount')}</Text>
          <Text style={rentUiStyles.value}>
            {`${formatDisplayAmount(summary.agreement.rentAmount, locale)} (${frequencyLabel})`}
          </Text>
        </View>
        <View style={rentUiStyles.statusRow}>
          <Text style={rentUiStyles.totalLabel}>{t('rent.agreement.outstanding')}</Text>
          <Text style={rentUiStyles.totalValue}>
            {formatDisplayAmount(summary.totalOutstanding, locale)}
          </Text>
        </View>
        <View style={rentUiStyles.statusRow}>
          <Text style={rentUiStyles.totalLabel}>{t('rent.agreement.overdue')}</Text>
          <Text style={[rentUiStyles.totalValue, rentStyles.overdue]}>
            {formatDisplayAmount(summary.overdue, locale)}
          </Text>
        </View>
        <View style={rentUiStyles.statusRow}>
          <Text style={rentUiStyles.totalLabel}>{t('rent.agreement.dueNow')}</Text>
          <Text style={rentUiStyles.totalValue}>{formatDisplayAmount(summary.dueNow, locale)}</Text>
        </View>
        <PrimaryButton
          title={t('rent.action.recordPayment')}
          onPress={() => router.push(`/rent/agreements/${agreementId}/pay`)}
          disabled={!canRecord}
        />
      </Card>

      <Card>
        <Text style={rentStyles.sectionTitle}>{t('rent.agreement.obligations')}</Text>
        {summary.obligations.length === 0 ? (
          <Text style={rentUiStyles.muted}>{t('rent.agreement.obligationsEmpty')}</Text>
        ) : (
          summary.obligations.map((row) => (
            <View key={row.installment.id} style={rentStyles.obligation}>
              <View style={rentUiStyles.statusRow}>
                <Text style={rentUiStyles.value}>{row.installment.dueDate}</Text>
                <Text
                  style={[
                    rentUiStyles.badge,
                    row.status === 'OVERDUE' ? rentUiStyles.badgeOverdue : null,
                  ]}
                >
                  {statusLabel(t, row.status)}
                </Text>
              </View>
              <Text style={rentUiStyles.muted}>
                {`${formatDisplayAmount(row.paidAmount, locale)} / ${formatDisplayAmount(
                  row.installment.amount,
                  locale,
                )}`}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={rentStyles.sectionTitle}>{t('rent.paymentHistory.title')}</Text>
        {payments.length === 0 ? (
          <Text style={rentUiStyles.muted}>{t('rent.paymentHistory.empty')}</Text>
        ) : (
          payments.map((row) => (
            <Pressable
              key={row.payment.id}
              onPress={() => router.push(`/rent/payments/${row.payment.id}`)}
              accessibilityRole="button"
              accessibilityLabel={t('rent.action.viewPayment')}
              style={({ pressed }) => (pressed ? rentUiStyles.pressedCard : undefined)}
            >
              <View style={rentUiStyles.statusRow}>
                <Text style={rentUiStyles.value}>{row.payment.paymentDate}</Text>
                <Text style={rentUiStyles.badge}>
                  {formatDisplayAmount(row.payment.amount, locale)}
                </Text>
              </View>
              <Text style={rentUiStyles.muted}>
                {`${methodLabel(t, row.payment.method)}${row.reversed ? ` · ${t(
                  'rent.paymentHistory.reversed',
                )}` : ''}`}
              </Text>
            </Pressable>
          ))
        )}
      </Card>

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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  overdue: {
    color: palette.danger,
  },
  obligation: {
    gap: spacing.xs,
  },
});
