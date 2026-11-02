import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../modules/account/presentation/routing';
import { styles } from '../../../modules/account/presentation/setup/setup-ui';
import { AgreementDetailsScreen } from '../../../modules/rental-agreement-management/presentation/agreement-details-screen';

export default function AgreementDetailsRoute() {
  const { agreementId } = useLocalSearchParams<{ agreementId: string }>();
  const destination: ApplicationRoute = `/agreements/${agreementId}`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <AgreementDetailsScreen agreementId={agreementId} />
    </SafeAreaView>
  );
}
