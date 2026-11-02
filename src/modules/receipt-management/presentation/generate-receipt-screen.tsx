import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { Card, PrimaryButton, styles } from '../../account/presentation/setup/setup-ui';
import { getRentPayment } from '../../rent-payment-management/infrastructure/composition-root';
import type { RentPaymentDetails } from '../../rent-payment-management/application/get-rent-payment';
import { methodLabel } from '../../rent-payment-management/presentation/rent-ui';
import type { GenerateReceiptResult } from '../application/generate-receipt';
import type { ReceiptView } from '../application/get-receipt';
import { generateReceipt, getReceiptForPayment } from '../infrastructure/composition-root';
import { receiptErrorKey } from './receipt-error-message';
import { receiptAmount, receiptOmittedList, receiptUiStyles, TextLink } from './receipt-ui';

interface GenerateReceiptScreenProps {
  paymentId: string;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={receiptUiStyles.row}>
      <Text style={receiptUiStyles.label}>{label}</Text>
      <Text style={receiptUiStyles.value}>{value}</Text>
    </View>
  );
}

/**
 * Review + finalize one receipt. The immutable receipt is only created when the
 * user confirms; generation is idempotent (a retry or double tap returns the
 * already-finalized receipt instead of duplicating it).
 */
export function GenerateReceiptScreen({ paymentId }: GenerateReceiptScreenProps) {
  const { t, locale } = useTranslation();
  const [details, setDetails] = useState<RentPaymentDetails | null>(() =>
    getRentPayment.execute(paymentId),
  );
  const [existing, setExisting] = useState<ReceiptView | null>(() =>
    getReceiptForPayment.execute(paymentId),
  );
  const [result, setResult] = useState<GenerateReceiptResult | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(() => {
    setDetails(getRentPayment.execute(paymentId));
    setExisting(getReceiptForPayment.execute(paymentId));
  }, [paymentId]);

  useFocusEffect(reload);

  if (details === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t('receipt.error.paymentMissing')}</Text>
        <TextLink title={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  if (details.reversal !== null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t('receipt.error.reversed')}</Text>
        <TextLink title={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  if (existing !== null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t('receipt.generate.existsTitle')}</Text>
        <Text style={styles.subtitle}>{t('receipt.generate.existsPrompt')}</Text>
        <PrimaryButton
          title={t('receipt.generate.view')}
          onPress={() => router.push(`/receipts/${existing.receipt.id}`)}
        />
        <TextLink title={t('receipt.generate.close')} onPress={() => router.back()} />
      </View>
    );
  }

  if (result !== null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{t('receipt.generate.successTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('receipt.generate.successNumber', { number: result.receipt.receiptNumber })}
        </Text>
        {result.omittedAssets.length > 0 ? (
          <Text style={receiptUiStyles.muted}>
            {t('receipt.generate.omittedAssets', {
              list: receiptOmittedList(t, result.omittedAssets),
            })}
          </Text>
        ) : null}
        <PrimaryButton
          title={t('receipt.generate.view')}
          onPress={() => router.push(`/receipts/${result.receipt.id}`)}
        />
        <TextLink title={t('receipt.generate.close')} onPress={() => router.back()} />
      </View>
    );
  }

  const { payment, allocations } = details;

  const finalize = async () => {
    setError(undefined);
    setFinalizing(true);
    try {
      const generated = await generateReceipt.execute({ paymentId, language: locale });
      setResult(generated);
    } catch (caught) {
      setError(t(receiptErrorKey(caught)));
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={receiptUiStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{`${conceptEmoji.receipts} ${t('receipt.generate.title')}`}</Text>
      <Text style={receiptUiStyles.collectible}>{t('receipt.generate.prompt')}</Text>

      <Card>
        <ReviewRow
          label={t('receipt.generate.paymentDate')}
          value={payment.paymentDate}
        />
        <ReviewRow
          label={t('receipt.generate.method')}
          value={methodLabel(t, payment.method)}
        />
        <ReviewRow
          label={t('receipt.generate.reference')}
          value={payment.reference ?? t('rent.payment.none')}
        />
        <ReviewRow
          label={t('receipt.generate.total')}
          value={receiptAmount(payment.amount, locale)}
        />
      </Card>

      <Card>
        <Text style={receiptUiStyles.sectionTitle}>{t('receipt.generate.allocations')}</Text>
        {allocations.map((allocation) => (
          <View key={allocation.installmentId} style={receiptUiStyles.allocRow}>
            <Text style={receiptUiStyles.value}>{allocation.installmentDueDate}</Text>
            <Text style={receiptUiStyles.badge}>
              {receiptAmount(allocation.amount, locale)}
            </Text>
          </View>
        ))}
      </Card>

      {error !== undefined ? <Text style={receiptUiStyles.notice}>{error}</Text> : null}

      <PrimaryButton
        title={finalizing ? t('receipt.generate.finalizing') : t('receipt.generate.finalize')}
        onPress={finalize}
        disabled={finalizing}
        loading={finalizing}
      />
      <TextLink title={t('common.back')} onPress={() => router.back()} />
    </ScrollView>
  );
}