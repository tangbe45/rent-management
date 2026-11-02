import { router } from 'expo-router';
import { useState } from 'react';

import { useTranslation } from '../../../shared/i18n';
import {
  InvalidPropertyAddressError,
  InvalidPropertyNameError,
} from '../domain/property';
import {
  createProperty,
  getProperty,
  updateProperty,
} from '../infrastructure/composition-root';
import { PropertyForm, type PropertyFormMode, type PropertyFormValues } from './property-form';
import { PropertyMessage } from './property-ui';

interface PropertyFormScreenProps {
  mode: PropertyFormMode;
  propertyId?: string;
}

export function PropertyFormScreen({ mode, propertyId }: PropertyFormScreenProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | undefined>();

  const existing =
    mode === 'edit' && propertyId !== undefined ? getProperty.execute({ id: propertyId }) : null;

  if (mode === 'edit' && existing === null) {
    return (
      <PropertyMessage
        title={t('properties.details.notFound')}
        actionLabel={t('common.back')}
        onAction={() => router.back()}
      />
    );
  }

  const handleSubmit = (values: PropertyFormValues) => {
    try {
      if (mode === 'create') {
        const created = createProperty.execute(values);
        router.replace(`/properties/${created.id}`);
        return;
      }
      if (existing !== null) {
        updateProperty.execute({ id: existing.id, ...values });
      }
      router.back();
    } catch (caught) {
      setError(
        caught instanceof InvalidPropertyNameError || caught instanceof InvalidPropertyAddressError
          ? caught.message
          : t('properties.error.generic'),
      );
    }
  };

  return (
    <PropertyForm
      key={existing?.id ?? 'create'}
      mode={mode}
      initialValues={
        existing !== null
          ? {
              name: existing.name,
              address: existing.address,
              description: existing.description ?? '',
            }
          : undefined
      }
      error={error}
      onSubmit={handleSubmit}
    />
  );
}