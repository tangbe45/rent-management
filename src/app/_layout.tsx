import { Stack } from 'expo-router';
import { useState, useEffect } from 'react';

import { runMigrations } from '../shared/infrastructure/database/migrate';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    runMigrations()
      .catch((error) => console.error('Failed to run database migrations', error))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="setup/index" />
      <Stack.Screen name="unlock/index" />
      <Stack.Screen name="dashboard/index" />
      <Stack.Screen name="properties/index" />
      <Stack.Screen name="properties/new" />
      <Stack.Screen name="properties/archived" />
      <Stack.Screen name="properties/[id]/index" />
      <Stack.Screen name="properties/[id]/edit" />
      <Stack.Screen name="properties/[id]/spaces/index" />
      <Stack.Screen name="properties/[id]/spaces/new" />
      <Stack.Screen name="properties/[id]/spaces/[spaceId]/index" />
      <Stack.Screen name="properties/[id]/spaces/[spaceId]/edit" />
      <Stack.Screen name="tenants/index" />
      <Stack.Screen name="tenants/new" />
      <Stack.Screen name="tenants/archived" />
      <Stack.Screen name="tenants/[tenantId]/index" />
      <Stack.Screen name="tenants/[tenantId]/edit" />
      <Stack.Screen name="agreements/index" />
      <Stack.Screen name="agreements/new" />
      <Stack.Screen name="agreements/[agreementId]/index" />
      <Stack.Screen name="agreements/[agreementId]/edit" />
      <Stack.Screen name="rent/index" />
      <Stack.Screen name="rent/record" />
      <Stack.Screen name="rent/agreements/[agreementId]/index" />
      <Stack.Screen name="rent/agreements/[agreementId]/pay" />
      <Stack.Screen name="rent/payments/index" />
      <Stack.Screen name="rent/payments/[paymentId]" />
      <Stack.Screen name="rent/tenants/[tenantId]" />
      <Stack.Screen name="receipts/index" />
      <Stack.Screen name="receipts/new" />
      <Stack.Screen name="receipts/[receiptId]/index" />
      <Stack.Screen name="settings/index" />
    </Stack>
  );
}