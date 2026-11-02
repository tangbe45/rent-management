import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../../../modules/account/presentation/routing';
import { styles } from '../../../../../modules/account/presentation/setup/setup-ui';
import { SpaceDetailsScreen } from '../../../../../modules/property-management/presentation/space-details-screen';

export default function PropertySpaceDetailsRoute() {
  const { id, spaceId } = useLocalSearchParams<{ id: string; spaceId: string }>();
  const destination: ApplicationRoute = `/properties/${id}/spaces/${spaceId}`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <SpaceDetailsScreen propertyId={id} spaceId={spaceId} />
    </SafeAreaView>
  );
}