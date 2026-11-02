import { Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authenticationSession } from '../../modules/account/infrastructure/composition-root';
import { resolveProtectedRoute } from '../../modules/account/presentation/routing';
import { styles } from '../../modules/account/presentation/setup/setup-ui';
import { AgreementFormScreen } from '../../modules/rental-agreement-management/presentation/agreement-form-screen';

const DESTINATION = '/agreements/new' as const;

export default function NewAgreementRoute() {
  const { tenantId, propertyId, spaceId } = useLocalSearchParams<{
    tenantId?: string;
    propertyId?: string;
    spaceId?: string;
  }>();

  const destination = resolveProtectedRoute({
    authenticated: authenticationSession.isAuthenticated(),
    destination: DESTINATION,
  });

  if (destination !== DESTINATION) {
    return <Redirect href={destination} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <AgreementFormScreen mode="create" prefill={{ tenantId, propertyId, spaceId }} />
    </SafeAreaView>
  );
}
