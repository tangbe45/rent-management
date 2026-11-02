import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../modules/account/presentation/routing';
import { styles } from '../../../modules/account/presentation/setup/setup-ui';
import { PropertyWorkspaceScreen } from '../../../modules/property-management/presentation/property-workspace-screen';

export default function PropertyWorkspaceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const destination: ApplicationRoute = `/properties/${id}`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <PropertyWorkspaceScreen propertyId={id} />
    </SafeAreaView>
  );
}