import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useTranslation, type TranslationKey } from '../../shared/i18n';

const implemented: { key: TranslationKey; href: string }[] = [
  { key: 'agreements.openList', href: '/agreements' },
  { key: 'rent.openDashboard', href: '/rent' },
  { key: 'receipts.openList', href: '/receipts' },
  { key: 'settings.openSettings', href: '/settings' },
];

const unavailable: TranslationKey[] = [
  'more.reports',
  'more.security',
  'more.backup',
  'more.subscription',
];

export default function MoreTab() {
  const { t } = useTranslation();
  return (
    <ScrollView>
      <View style={{ padding: 16 }}>
        {implemented.map((i) => (
          <Pressable
            key={i.href + i.key}
            onPress={() => router.push(i.href as any)}
            accessibilityRole="button"
            accessibilityLabel={t(i.key)}
            style={{ paddingVertical: 12 }}
          >
            <Text>{t(i.key)}</Text>
          </Pressable>
        ))}
        {unavailable.map((key) => (
          <View key={key} style={{ paddingVertical: 12, opacity: 0.5 }}>
            <Text>{`${t(key)} (${t('common.comingSoon' as TranslationKey)})`}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
