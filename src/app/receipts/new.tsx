import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../modules/account/presentation/routing';
import { styles } from '../../modules/account/presentation/setup/setup-ui';
import { GenerateReceiptScreen } from '../../modules/receipt-management/presentation/generate-receipt-screen';

export default function GenerateReceiptRoute() {
  const { paymentId } = useLocalSearchParams<{ paymentId?: string }>();
  const destination: ApplicationRoute = '/receipts/new';
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  if (paymentId === undefined || paymentId.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <GenerateReceiptScreen paymentId="" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <GenerateReceiptScreen paymentId={paymentId} />
    </SafeAreaView>
  );
}