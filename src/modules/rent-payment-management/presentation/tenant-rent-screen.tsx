import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslation, type TranslationKey } from '../../../shared/i18n';
import { formatDisplayAmount } from '../../../shared/presentation/money';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { palette, Card, spacing, styles } from '../../account/presentation/setup/setup-ui';
import { getTenant } from '../../tenant-management/infrastructure/composition-root';
import type { RentAgreementSummary } from '../application/get-rent-summary';
import { getRentSummary } from '../infrastructure/composition-root';
import { RentMessage, rentUiStyles, TextLink } from './rent-ui';

interface TenantRentScreenProps {
  tenantId: string;
}

/**
 * A tenant's rent across all of their agreements, one card per agreement so
 * allocations from different agreements are never mixed. Each card links to the
 * agreement's rent screen where a payment can be recorded.
 */
export function TenantRentScreen({ tenantId }: TenantRentScreenProps) {
  const { t, locale } = useTranslation();
  const [summaries, setSummaries] = useState<RentAgreementSummary[]>(() =>
    getRentSummary.execute({ tenantId }),
  );

  const reload = useCallback(() => {
    setSummaries(getRentSummary.execute({ tenantId }));
  }, [tenantId]);

  useFocusEffect(reload);

  if (summaries.length === 0) {
    return (
      <RentMessage
        title={t('rent.tenant.empty')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const tenant = getTenant.execute({ id: tenantId });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={rentStyles.content}>
      <Text style={styles.title}>{`${conceptEmoji.rent} ${t('rent.tenant.title')}`}</Text>
      {tenant !== null ? <Text style={styles.subtitle}>{tenant.fullName}</Text> : null}

      {summaries.map((summary) => {
        const frequencyLabel = t(
          `agreements.frequency.${summary.agreement.rentFrequency}` as TranslationKey,
        );
        return (
          <Card key={summary.agreement.id}>
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
            <TextLink
              title={t('rent.action.recordPayment')}
              onPress={() => router.push(`/rent/agreements/${summary.agreement.id}`)}
            />
          </Card>
        );
      })}

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
  overdue: {
    color: palette.danger,
  },
});
