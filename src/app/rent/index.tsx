import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../modules/account/infrastructure/composition-root';
import { resolveProtectedRoute } from '../../modules/account/presentation/routing';
import { styles } from '../../modules/account/presentation/setup/setup-ui';
import { RentDashboardScreen } from '../../modules/rent-payment-management/presentation/rent-dashboard-screen';

export default function RentDashboardRoute() {
  const destination = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination: '/rent',
  });

  if (destination !== '/rent') {
    return <Redirect href={destination} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <RentDashboardScreen />
    </SafeAreaView>
  );
}
