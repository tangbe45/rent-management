import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../modules/account/presentation/routing';
import { styles } from '../../../modules/account/presentation/setup/setup-ui';
import { TenantFormScreen } from '../../../modules/tenant-management/presentation/tenant-form-screen';

export default function EditTenantRoute() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const destination: ApplicationRoute = `/tenants/${tenantId}/edit`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <TenantFormScreen mode="edit" tenantId={tenantId} />
    </SafeAreaView>
  );
}
