import { Tabs } from 'expo-router';
import { useTranslation } from '../../shared/i18n';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('dashboard.title') }} />
      <Tabs.Screen name="properties" options={{ title: t('properties.openList') }} />
      <Tabs.Screen name="tenants" options={{ title: t('tenants.openList') }} />
      <Tabs.Screen name="more" options={{ title: t('more.title') }} />
    </Tabs>
  );
}
