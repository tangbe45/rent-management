import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../modules/account/presentation/routing';
import { styles } from '../../../modules/account/presentation/setup/setup-ui';
import { ReceiptDetailsScreen } from '../../../modules/receipt-management/presentation/receipt-details-screen';

export default function ReceiptDetailsRoute() {
  const { receiptId } = useLocalSearchParams<{ receiptId: string }>();
  const destination: ApplicationRoute = `/receipts/${receiptId}`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ReceiptDetailsScreen receiptId={receiptId} />
    </SafeAreaView>
  );
}