import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import type { ReceiptListItem } from '../application/list-receipts';
import { listReceipts } from '../infrastructure/composition-root';
import { ReceiptMessage, receiptAmount, receiptUiStyles, TextLink } from './receipt-ui';

function issuedDate(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleDateString(locale);
}

/**
 * Newest-first history of finalized receipts. Receipts are immutable and the
 * reversal badge is derived from the payment, never stored as a receipt state.
 */
export function ReceiptHistoryScreen() {
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<ReceiptListItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(() => {
    try {
      setItems(listReceipts.execute());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useFocusEffect(reload);

  if (failed) {
    return (
      <ReceiptMessage
        title={t('receipts.history.error')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  if (items !== null && items.length === 0) {
    return (
      <ReceiptMessage
        title={t('receipts.history.empty')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={receiptUiStyles.content}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#1F2933' }}>
        {`${conceptEmoji.receipts} ${t('receipts.history.title')}`}
      </Text>
      <Text style={receiptUiStyles.muted}>{t('receipts.history.subtitle')}</Text>

      {items === null ? <Text style={receiptUiStyles.muted}>…</Text> : null}

      {items?.map(({ receipt, reversed }) => {
        const snapshot = receipt.snapshot;
        return (
          <Pressable
            key={receipt.id}
            onPress={() => router.push(`/receipts/${receipt.id}`)}
            accessibilityRole="button"
            accessibilityLabel={receipt.receiptNumber}
            style={({ pressed }) => pressed && { opacity: 0.75 }}
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: '#E2DCD0',
                borderRadius: 12,
                padding: 16,
                backgroundColor: '#FFFFFF',
                gap: 8,
              }}
            >
              <View style={receiptUiStyles.row}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2933' }}>
                  {receipt.receiptNumber}
                </Text>
                {reversed ? (
                  <Text style={[receiptUiStyles.badge, receiptUiStyles.badgeDanger]}>
                    {t('receipts.history.reversed')}
                  </Text>
                ) : null}
              </View>
              <Text style={receiptUiStyles.value}>{snapshot.tenant.fullName}</Text>
              <View style={receiptUiStyles.row}>
                <Text style={receiptUiStyles.muted}>
                  {t('receipts.history.generatedOn', { date: issuedDate(snapshot.generatedAt, locale) })}
                </Text>
                <Text style={receiptUiStyles.badge}>{receiptAmount(snapshot.payment.amount, locale)}</Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      <TextLink title={t('common.back')} onPress={() => router.back()} />
    </ScrollView>
  );
}