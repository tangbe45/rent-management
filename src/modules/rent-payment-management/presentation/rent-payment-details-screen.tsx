import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { formatDisplayAmount } from '../../../shared/presentation/money';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { palette, Card, PrimaryButton, spacing, styles } from '../../account/presentation/setup/setup-ui';
import type { RentPaymentDetails } from '../application/get-rent-payment';
import { PAYMENT_REVERSAL_REASONS, type PaymentReversalReason } from '../domain/payment-reversal';
import { getRentPayment, reverseRentPayment } from '../infrastructure/composition-root';
import { getReceiptForPayment } from '../../receipt-management/infrastructure/composition-root';
import type { ReceiptView } from '../../receipt-management/application/get-receipt';
import { paymentErrorKey } from './payment-error-message';
import { methodLabel, reasonLabel, RentMessage, rentUiStyles, TextLink } from './rent-ui';

interface RentPaymentDetailsScreenProps {
  paymentId: string;
}

/**
 * One payment's immutable details: its fields, the rent periods it was applied
 * to, and its reversal (if any). An un-reversed payment can be reversed here,
 * which records a separate fact and never edits the original.
 */
export function RentPaymentDetailsScreen({ paymentId }: RentPaymentDetailsScreenProps) {
  const { t, locale } = useTranslation();
  const [details, setDetails] = useState<RentPaymentDetails | null>(() =>
    getRentPayment.execute(paymentId),
  );
  const [reversing, setReversing] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptView | null>(() =>
    getReceiptForPayment.execute(paymentId),
  );
  const [reason, setReason] = useState<PaymentReversalReason>('WRONG_AMOUNT');
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(() => {
    setDetails(getRentPayment.execute(paymentId));
    setReceipt(getReceiptForPayment.execute(paymentId));
  }, [paymentId]);

  useFocusEffect(reload);

  if (details === null) {
    return (
      <RentMessage
        title={t('rent.payment.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const { payment, reversal, allocations } = details;

  const confirmReversal = () => {
    setError(undefined);
    try {
      reverseRentPayment.execute({ paymentId, reason, explanation });
      setReversing(false);
      setExplanation('');
      reload();
    } catch (caught) {
      setError(t(paymentErrorKey(caught)));
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={rentStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{`${conceptEmoji.rent} ${t('rent.payment.title')}`}</Text>

      <Card>
        <View style={rentUiStyles.row}>
          <Text style={rentUiStyles.label}>{t('rent.payment.amount')}</Text>
          <Text style={rentUiStyles.value}>{formatDisplayAmount(payment.amount, locale)}</Text>
        </View>
        <View style={rentUiStyles.row}>
          <Text style={rentUiStyles.label}>{t('rent.payment.date')}</Text>
          <Text style={rentUiStyles.value}>{payment.paymentDate}</Text>
        </View>
        <View style={rentUiStyles.row}>
          <Text style={rentUiStyles.label}>{t('rent.payment.method')}</Text>
          <Text style={rentUiStyles.value}>{methodLabel(t, payment.method)}</Text>
        </View>
        <View style={rentUiStyles.row}>
          <Text style={rentUiStyles.label}>{t('rent.payment.reference')}</Text>
          <Text style={rentUiStyles.value}>{payment.reference ?? t('rent.payment.none')}</Text>
        </View>
        <View style={rentUiStyles.row}>
          <Text style={rentUiStyles.label}>{t('rent.payment.notes')}</Text>
          <Text style={rentUiStyles.value}>{payment.notes ?? t('rent.payment.none')}</Text>
        </View>
      </Card>

      <Card>
        <Text style={rentStyles.sectionTitle}>{t('rent.payment.allocations')}</Text>
        {allocations.length === 0 ? (
          <Text style={rentUiStyles.muted}>{t('rent.payment.allocationsEmpty')}</Text>
        ) : (
          allocations.map((allocation) => (
            <View key={allocation.installmentId} style={rentUiStyles.statusRow}>
              <Text style={rentUiStyles.value}>{allocation.installmentDueDate}</Text>
              <Text style={rentUiStyles.badge}>
                {formatDisplayAmount(allocation.amount, locale)}
              </Text>
            </View>
          ))
        )}
      </Card>

      {reversal !== null ? (
        <Card>
          <Text style={[rentStyles.sectionTitle, rentStyles.reversed]}>
            {t('rent.payment.reversedOn', {
              date: new Date(reversal.reversedAt).toLocaleDateString(locale),
            })}
          </Text>
          <View style={rentUiStyles.row}>
            <Text style={rentUiStyles.label}>{t('rent.payment.reversalReason')}</Text>
            <Text style={rentUiStyles.value}>{reasonLabel(t, reversal.reason)}</Text>
          </View>
          {reversal.explanation !== null ? (
            <Text style={rentUiStyles.muted}>{reversal.explanation}</Text>
          ) : null}
        </Card>
      ) : reversing ? (
        <Card>
          <Text style={rentStyles.sectionTitle}>{t('rent.payment.reverseTitle')}</Text>
          <Text style={rentUiStyles.muted}>{t('rent.payment.reversePrompt')}</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('rent.payment.reason')}</Text>
            <View style={rentStyles.reasons}>
              {PAYMENT_REVERSAL_REASONS.map((candidate) => (
                <Pressable
                  key={candidate}
                  onPress={() => setReason(candidate)}
                  accessibilityRole="button"
                  accessibilityLabel={reasonLabel(t, candidate)}
                  style={[
                    rentStyles.reason,
                    candidate === reason ? rentStyles.reasonSelected : null,
                  ]}
                >
                  <Text
                    style={
                      candidate === reason ? rentStyles.reasonTextSelected : rentStyles.reasonText
                    }
                  >
                    {reasonLabel(t, candidate)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {reason === 'OTHER' ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('rent.payment.explanation')}</Text>
              <TextInput
                value={explanation}
                onChangeText={setExplanation}
                placeholder={t('rent.payment.explanationPlaceholder')}
                accessibilityLabel={t('rent.payment.explanation')}
                style={styles.input}
              />
            </View>
          ) : null}
          {error !== undefined ? <Text style={styles.fieldError}>{error}</Text> : null}
          <PrimaryButton title={t('rent.payment.confirmReverse')} onPress={confirmReversal} />
          <Pressable
            onPress={() => {
              setReversing(false);
              setError(undefined);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('rent.payment.cancelReverse')}
          >
            <Text style={rentStyles.cancel}>{t('rent.payment.cancelReverse')}</Text>
          </Pressable>
        </Card>
      ) : (
        <PrimaryButton
          title={t('rent.payment.reverse')}
          onPress={() => {
            setReversing(true);
            setError(undefined);
          }}
        />
      )}

      <Card>
        <Text style={rentStyles.sectionTitle}>{`${conceptEmoji.receipts} ${t('receipt.generate.title')}`}</Text>
        {receipt !== null ? (
          <TextLink
            title={t('receipt.generate.view')}
            onPress={() => router.push(`/receipts/${receipt.receipt.id}`)}
          />
        ) : reversal !== null ? (
          <Text style={rentUiStyles.muted}>{t('receipt.error.reversed')}</Text>
        ) : (
          <TextLink
            title={t('receipt.generate.title')}
            onPress={() =>
              router.push({ pathname: '/receipts/new', params: { paymentId } })
            }
          />
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
  reversed: {
    color: palette.danger,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  reason: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: palette.background,
  },
  reasonSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  reasonText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  reasonTextSelected: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '600',
  },
  cancel: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing.s,
  },
});
