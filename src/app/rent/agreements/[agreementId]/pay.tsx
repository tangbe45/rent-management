import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../../modules/account/presentation/routing';
import { styles } from '../../../../modules/account/presentation/setup/setup-ui';
import { RecordRentPaymentScreen } from '../../../../modules/rent-payment-management/presentation/record-rent-payment-screen';

export default function RecordRentPaymentRoute() {
  const { agreementId } = useLocalSearchParams<{ agreementId: string }>();
  const destination: ApplicationRoute = `/rent/agreements/${agreementId}/pay`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <RecordRentPaymentScreen agreementId={agreementId} />
    </SafeAreaView>
  );
}
