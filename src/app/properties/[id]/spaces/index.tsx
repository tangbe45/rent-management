import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../../modules/account/presentation/routing';
import { styles } from '../../../../modules/account/presentation/setup/setup-ui';
import { ArchivedSpaceListScreen } from '../../../../modules/property-management/presentation/archived-space-list-screen';

export default function PropertyArchivedSpacesRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const destination: ApplicationRoute = `/properties/${id}/spaces`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ArchivedSpaceListScreen propertyId={id} />
    </SafeAreaView>
  );
}