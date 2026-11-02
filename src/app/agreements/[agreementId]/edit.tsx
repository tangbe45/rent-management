import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../../modules/account/infrastructure/composition-root';
import {
  resolveProtectedRoute,
  type ApplicationRoute,
} from '../../../modules/account/presentation/routing';
import { styles } from '../../../modules/account/presentation/setup/setup-ui';
import { AgreementFormScreen } from '../../../modules/rental-agreement-management/presentation/agreement-form-screen';

export default function EditAgreementRoute() {
  const { agreementId } = useLocalSearchParams<{ agreementId: string }>();
  const destination: ApplicationRoute = `/agreements/${agreementId}/edit`;
  const resolved = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination,
  });

  if (resolved !== destination) {
    return <Redirect href={resolved} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <AgreementFormScreen mode="edit" agreementId={agreementId} />
    </SafeAreaView>
  );
}
