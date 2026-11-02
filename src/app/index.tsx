import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  authenticationSession,
  getApplicationState,
} from '../modules/account/infrastructure/composition-root';
import {
  resolveInitialRoute,
  type ApplicationRoute,
} from '../modules/account/presentation/routing';

export default function IndexScreen() {
  const [route, setRoute] = useState<ApplicationRoute | null>(null);

  useEffect(() => {
    getApplicationState
      .execute()
      .then((state) =>
        setRoute(
          resolveInitialRoute({
            initialized: state.initialized,
            authenticated: authenticationSession.isAuthenticated(),
          }),
        ),
      )
      .catch(() => setRoute('/setup'));
  }, []);

  if (route === null) {
    return null;
  }

  return <Redirect href={route} />;
}
