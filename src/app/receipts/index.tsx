import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../modules/account/infrastructure/composition-root';
import { resolveProtectedRoute } from '../../modules/account/presentation/routing';
import { styles } from '../../modules/account/presentation/setup/setup-ui';
import { ReceiptHistoryScreen } from '../../modules/receipt-management/presentation/receipt-history-screen';

export default function ReceiptHistoryRoute() {
  const destination = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination: '/receipts',
  });

  if (destination !== '/receipts') {
    return <Redirect href={destination} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ReceiptHistoryScreen />
    </SafeAreaView>
  );
}