import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../modules/account/infrastructure/composition-root';
import { DashboardScreen } from '../../modules/account/presentation/dashboard/dashboard-screen';
import { resolveProtectedRoute } from '../../modules/account/presentation/routing';
import { styles } from '../../modules/account/presentation/setup/setup-ui';

export default function DashboardScreenRoute() {
  const destination = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination: '/dashboard',
  });

  if (destination !== '/dashboard') {
    return <Redirect href={destination} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <DashboardScreen />
    </SafeAreaView>
  );
}
