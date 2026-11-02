import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../modules/account/infrastructure/composition-root';
import { resolveProtectedRoute } from '../../modules/account/presentation/routing';
import { styles } from '../../modules/account/presentation/setup/setup-ui';
import { SettingsScreen } from '../../modules/settings/presentation/settings-screen';

export default function SettingsRoute() {
  const destination = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination: '/settings',
  });

  if (destination !== '/settings') {
    return <Redirect href={destination} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <SettingsScreen />
    </SafeAreaView>
  );
}