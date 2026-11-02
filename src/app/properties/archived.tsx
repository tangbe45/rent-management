import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../modules/account/infrastructure/composition-root';
import { resolveProtectedRoute } from '../../modules/account/presentation/routing';
import { styles } from '../../modules/account/presentation/setup/setup-ui';
import { ArchivedPropertyListScreen } from '../../modules/property-management/presentation/archived-property-list-screen';

const DESTINATION = '/properties/archived' as const;

export default function ArchivedPropertiesRoute() {
  const destination = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination: DESTINATION,
  });

  if (destination !== DESTINATION) {
    return <Redirect href={destination} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ArchivedPropertyListScreen />
    </SafeAreaView>
  );
}