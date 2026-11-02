import { Text } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { Card, KeyboardSafeContainer, styles } from '../../account/presentation/setup/setup-ui';
import type { Property } from '../domain/property';
import { listItemStyles } from './list-item-styles';
import { SecondaryButton, TextLink } from './property-ui';

interface ArchivedPropertyListProps {
  properties: readonly Property[];
  onOpen: (id: string) => void;
  onRestore: (id: string) => void;
  onBack: () => void;
}

export function ArchivedPropertyList({
  properties,
  onOpen,
  onRestore,
  onBack,
}: ArchivedPropertyListProps) {
  const { t } = useTranslation();

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>
        {`${conceptEmoji.properties} ${t('properties.archived.title')}`}
      </Text>
      {properties.length === 0 ? (
        <Text style={styles.subtitle}>{t('properties.archived.empty')}</Text>
      ) : (
        properties.map((property) => (
          <Card key={property.id}>
            <Text style={listItemStyles.name}>{property.name}</Text>
            <Text style={listItemStyles.address}>{property.address}</Text>
            <SecondaryButton
              title={t('properties.action.open')}
              onPress={() => onOpen(property.id)}
            />
            <SecondaryButton
              title={t('properties.action.restore')}
              onPress={() => onRestore(property.id)}
            />
          </Card>
        ))
      )}
      <TextLink title={t('common.back')} onPress={onBack} />
    </KeyboardSafeContainer>
  );
}