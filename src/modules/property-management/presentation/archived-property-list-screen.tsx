import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Property } from '../domain/property';
import { listArchivedProperties, restoreProperty } from '../infrastructure/composition-root';
import { ArchivedPropertyList } from './archived-property-list';

export function ArchivedPropertyListScreen() {
  const [properties, setProperties] = useState<readonly Property[]>(() =>
    listArchivedProperties.execute(),
  );

  // Re-read whenever the screen regains focus, so a property archived or
  // restored elsewhere appears correctly on return. Driven by the navigation
  // focus lifecycle rather than a render-time value, which may not change while
  // the covered screen is not re-rendered.
  const reload = useCallback(() => {
    setProperties(listArchivedProperties.execute());
  }, []);

  useFocusEffect(reload);

  const handleRestore = (id: string) => {
    restoreProperty.execute({ id });
    reload();
  };

  return (
    <ArchivedPropertyList
      properties={properties}
      onOpen={(id) => router.push(`/properties/${id}/details`)}
      onRestore={handleRestore}
      onBack={() => router.back()}
    />
  );
}
