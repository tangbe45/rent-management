import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../../modules/account/presentation/routing';
import { styles } from '../../../../modules/account/presentation/setup/setup-ui';
import { SpaceFormScreen } from '../../../../modules/property-management/presentation/space-form-screen';

export default function NewPropertySpaceRoute() {
  const { id, parentSpaceId } = useLocalSearchParams<{ id: string; parentSpaceId?: string }>();
  const destination: ApplicationRoute = `/properties/${id}/spaces/new`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <SpaceFormScreen mode="create" propertyId={id} initialParentId={parentSpaceId ?? null} />
    </SafeAreaView>
  );
}