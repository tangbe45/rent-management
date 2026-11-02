import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatDisplayAmount } from '../../../shared/presentation/money';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { useTranslation } from '../../../shared/i18n';
import { palette, Card, PrimaryButton, spacing, styles } from '../../account/presentation/setup/setup-ui';
import type { RentDashboard } from '../application/get-rent-dashboard';
import { getRentDashboard } from '../infrastructure/composition-root';
import { rentUiStyles, statusLabel, TextLink } from './rent-ui';

/**
 * The rent dashboard: total overdue, total due now and the money collected this
 * calendar month, plus the unpaid due/overdue periods that need attention.
 */
export function RentDashboardScreen() {
  const { t, locale } = useTranslation();
  const [dashboard, setDashboard] = useState<RentDashboard | null>(() =>
    getRentDashboard.execute(),
  );

  const reload = useCallback(() => {
    setDashboard(getRentDashboard.execute());
  }, []);

  useFocusEffect(reload);

  if (dashboard === null) {
    return null;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={rentStyles.content}>
      <Text style={styles.title}>{`${conceptEmoji.rent} ${t('rent.dashboard.title')}`}</Text>
      <Text style={styles.subtitle}>{t('rent.dashboard.subtitle')}</Text>

      <PrimaryButton
        title={t('rent.action.recordPayment')}
        onPress={() => router.push('/rent/record')}
      />

      <Card>
        <View style={rentUiStyles.row}>
          <Text style={rentUiStyles.totalLabel}>{t('rent.dashboard.overdue')}</Text>
          <Text style={[rentUiStyles.totalValue, rentStyles.overdue]}>
            {formatDisplayAmount(dashboard.totalOverdue, locale)}
          </Text>
        </View>
        <View style={rentUiStyles.row}>
          <Text style={rentUiStyles.totalLabel}>{t('rent.dashboard.dueNow')}</Text>
          <Text style={rentUiStyles.totalValue}>
            {formatDisplayAmount(dashboard.totalDueNow, locale)}
          </Text>
        </View>
        <View style={rentUiStyles.row}>
          <Text style={rentUiStyles.totalLabel}>{t('rent.dashboard.collectedThisMonth')}</Text>
          <Text style={rentUiStyles.totalValue}>
            {formatDisplayAmount(dashboard.totalCollectedThisMonth, locale)}
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={rentStyles.sectionTitle}>{t('rent.dashboard.attentionTitle')}</Text>
        {dashboard.attentionItems.length === 0 ? (
          <Text style={rentUiStyles.muted}>{t('rent.dashboard.attentionEmpty')}</Text>
        ) : (
          dashboard.attentionItems.map((item) => (
            <Pressable
              key={item.installmentId}
              onPress={() => router.push(`/rent/agreements/${item.agreementId}`)}
              accessibilityRole="button"
              accessibilityLabel={t('rent.dashboard.openAgreement')}
              style={({ pressed }) => (pressed ? rentUiStyles.pressedCard : undefined)}
            >
              <View style={rentUiStyles.statusRow}>
                <Text style={rentUiStyles.value}>{item.dueDate}</Text>
                <Text
                  style={[
                    rentUiStyles.badge,
                    item.status === 'OVERDUE' ? rentUiStyles.badgeOverdue : null,
                  ]}
                >
                  {statusLabel(t, item.status)}
                </Text>
              </View>
              <Text style={rentUiStyles.muted}>
                {formatDisplayAmount(item.remainingAmount, locale)}
              </Text>
            </Pressable>
          ))
        )}
      </Card>

      <TextLink
        title={t('rent.history.title')}
        onPress={() => router.push('/rent/payments')}
      />
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
});
