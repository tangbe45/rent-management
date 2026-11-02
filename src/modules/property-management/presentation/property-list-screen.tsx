import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Property } from '../domain/property';
import { listProperties } from '../infrastructure/composition-root';
import { PropertyList } from './property-list';

export function PropertyListScreen() {
  const [properties, setProperties] = useState<readonly Property[]>(() =>
    listProperties.execute(),
  );

  // Reload from SQLite every time the screen regains focus. The focus lifecycle
  // is driven by navigation events, so it also fires when the list stays mounted
  // beneath the create form — unlike a value read during render, which may never
  // change while the covered screen is not re-rendered.
  useFocusEffect(
    useCallback(() => {
      setProperties(listProperties.execute());
    }, []),
  );

  return (
    <PropertyList
      properties={properties}
      onOpen={(id) => router.push(`/properties/${id}`)}
      onCreate={() => router.push('/properties/new')}
      onOpenArchived={() => router.push('/properties/archived')}
    />
  );
}
