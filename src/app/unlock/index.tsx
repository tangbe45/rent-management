import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '../../modules/account/presentation/setup/setup-ui';
import { UnlockScreen } from '../../modules/account/presentation/unlock/unlock-screen';

export default function UnlockScreenRoute() {
  return (
    <SafeAreaView style={styles.screen}>
      <UnlockScreen />
    </SafeAreaView>
  );
}
