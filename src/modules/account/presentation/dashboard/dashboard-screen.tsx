import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation, type TranslationKey } from '../../../../shared/i18n';
import { conceptEmoji } from '../../../../shared/presentation/emojis';
import type { SubscriptionStatus } from '../../../subscription/application/get-subscription-status';
import { getSubscriptionStatus } from '../../../subscription/infrastructure/composition-root';
import { authenticationSession } from '../../infrastructure/composition-root';
import { Card, palette, PrimaryButton, styles } from '../setup/setup-ui';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

function statusMessage(t: Translate, status: SubscriptionStatus): string {
  if (status.state === 'EXPIRED') {
    return t('dashboard.subscription.expired', { date: String(status.endDate) });
  }
  if (status.state === 'FUTURE') {
    return t('dashboard.subscription.future', { date: String(status.startDate) });
  }
  return status.type === 'TRIAL'
    ? t('dashboard.subscription.activeTrial', { date: String(status.endDate) })
    : t('dashboard.subscription.active', { date: String(status.endDate) });
}

/**
 * Temporary authenticated placeholder destination. Rental features are not
 * part of this slice, so the screen only confirms the authenticated state,
 * communicates the subscription entitlement, and offers the explicit runtime
 * lock mechanism. Navigation and data viewing are never blocked by the
 * subscription state.
 */
export function DashboardScreen() {
  const { t } = useTranslation();
  const [subscriptionStatus] = useState<SubscriptionStatus | null>(() => {
    try {
      return getSubscriptionStatus.execute();
    } catch {
      return null;
    }
  });

  const handleLock = () => {
    authenticationSession.lock();
    router.replace('/unlock');
  };

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>{`${conceptEmoji.dashboard} ${t('dashboard.title')}`}</Text>
      <Text style={styles.subtitle}>{t('dashboard.subtitle')}</Text>
      <Card>
        {subscriptionStatus !== null && subscriptionStatus.state !== 'NONE' ? (
          <Text
            style={[
              dashboardStyles.status,
              subscriptionStatus.state === 'EXPIRED' ? dashboardStyles.statusExpired : null,
            ]}
          >
            {statusMessage(t, subscriptionStatus)}
          </Text>
        ) : null}
        <PrimaryButton title={t('dashboard.lock')} onPress={handleLock} />
      </Card>
      <Pressable
        onPress={() => router.push('/properties')}
        accessibilityRole="button"
        accessibilityLabel={t('properties.openList')}
        style={({ pressed }) => (pressed ? dashboardStyles.pressed : undefined)}
      >
        <Text style={dashboardStyles.link}>{t('properties.openList')}</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/tenants')}
        accessibilityRole="button"
        accessibilityLabel={t('tenants.openList')}
        style={({ pressed }) => (pressed ? dashboardStyles.pressed : undefined)}
      >
        <Text style={dashboardStyles.link}>{t('tenants.openList')}</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/agreements')}
        accessibilityRole="button"
        accessibilityLabel={t('agreements.openList')}
        style={({ pressed }) => (pressed ? dashboardStyles.pressed : undefined)}
      >
        <Text style={dashboardStyles.link}>{t('agreements.openList')}</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/rent')}
        accessibilityRole="button"
        accessibilityLabel={t('rent.openDashboard')}
        style={({ pressed }) => (pressed ? dashboardStyles.pressed : undefined)}
      >
        <Text style={dashboardStyles.link}>{t('rent.openDashboard')}</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/receipts')}
        accessibilityRole="button"
        accessibilityLabel={t('receipts.openList')}
        style={({ pressed }) => (pressed ? dashboardStyles.pressed : undefined)}
      >
        <Text style={dashboardStyles.link}>{t('receipts.openList')}</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        accessibilityLabel={t('settings.openSettings')}
        style={({ pressed }) => (pressed ? dashboardStyles.pressed : undefined)}
      >
        <Text style={dashboardStyles.link}>{t('settings.openSettings')}</Text>
      </Pressable>
    </View>
  );
}

const dashboardStyles = StyleSheet.create({
  status: {
    fontSize: 15,
    lineHeight: 21,
    color: palette.textMuted,
    textAlign: 'center',
  },
  statusExpired: {
    color: palette.danger,
    fontWeight: '600',
  },
  link: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
