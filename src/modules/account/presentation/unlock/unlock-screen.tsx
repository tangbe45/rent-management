import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { authenticateWithPin, getOwnerProfile } from '../../infrastructure/composition-root';
import { UnlockForm } from './unlock-form';

/**
 * Container for the PIN unlock screen: it loads the single owner's identity
 * for a personal greeting, delegates verification to the `AuthenticateWithPin`
 * use case, and enters the authenticated area on success. The form never
 * touches credential storage directly.
 */
export function UnlockScreen() {
  const [firstName, setFirstName] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    getOwnerProfile
      .execute()
      .then((profile) => {
        if (active && profile !== null) {
          setFirstName(profile.fullName.trim().split(/\s+/)[0]);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const handleUnlock = async (pin: string): Promise<boolean> => {
    const authenticated = await authenticateWithPin.execute({ pin });
    if (authenticated) {
      router.replace('/dashboard');
    }
    return authenticated;
  };

  return <UnlockForm firstName={firstName} onSubmit={handleUnlock} />;
}
