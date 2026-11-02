import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../modules/account/infrastructure/composition-root';
import { resolveProtectedRoute } from '../../../modules/account/presentation/routing';
import { styles } from '../../../modules/account/presentation/setup/setup-ui';
import { RentPaymentHistoryScreen } from '../../../modules/rent-payment-management/presentation/rent-payment-history-screen';

export default function RentPaymentHistoryRoute() {
  const destination = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination: '/rent/payments',
  });

  if (destination !== '/rent/payments') {
    return <Redirect href={destination} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <RentPaymentHistoryScreen />
    </SafeAreaView>
  );
}
