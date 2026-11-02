import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../modules/account/presentation/routing';
import { styles } from '../../../modules/account/presentation/setup/setup-ui';
import { TenantDetailsScreen } from '../../../modules/tenant-management/presentation/tenant-details-screen';

export default function TenantDetailsRoute() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const destination: ApplicationRoute = `/tenants/${tenantId}`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <TenantDetailsScreen tenantId={tenantId} />
    </SafeAreaView>
  );
}
