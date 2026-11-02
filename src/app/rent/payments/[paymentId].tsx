import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../modules/account/presentation/routing';
import { styles } from '../../../modules/account/presentation/setup/setup-ui';
import { RentPaymentDetailsScreen } from '../../../modules/rent-payment-management/presentation/rent-payment-details-screen';

export default function RentPaymentDetailsRoute() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const destination: ApplicationRoute = `/rent/payments/${paymentId}`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <RentPaymentDetailsScreen paymentId={paymentId} />
    </SafeAreaView>
  );
}
