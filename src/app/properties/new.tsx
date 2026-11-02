import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../modules/account/infrastructure/composition-root';
import { resolveProtectedRoute } from '../../modules/account/presentation/routing';
import { styles } from '../../modules/account/presentation/setup/setup-ui';
import { PropertyFormScreen } from '../../modules/property-management/presentation/property-form-screen';

const DESTINATION = '/properties/new' as const;

export default function NewPropertyRoute() {
  const destination = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination: DESTINATION,
  });

  if (destination !== DESTINATION) {
    return <Redirect href={destination} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <PropertyFormScreen mode="create" />
    </SafeAreaView>
  );
}