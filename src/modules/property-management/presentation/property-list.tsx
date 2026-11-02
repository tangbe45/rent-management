import { Pressable, Text } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import {
  Card,
  KeyboardSafeContainer,
  PrimaryButton,
  styles,
} from '../../account/presentation/setup/setup-ui';
import type { Property } from '../domain/property';
import { listItemStyles } from './list-item-styles';
import { TextLink } from './property-ui';

interface PropertyListProps {
  properties: readonly Property[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onOpenArchived: () => void;
}

export function PropertyList({ properties, onOpen, onCreate, onOpenArchived }: PropertyListProps) {
  const { t } = useTranslation();

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>{`${conceptEmoji.properties} ${t('properties.list.title')}`}</Text>
      {properties.length === 0 ? (
        <Text style={styles.subtitle}>{t('properties.list.empty')}</Text>
      ) : (
        properties.map((property) => (
          <Pressable
            key={property.id}
            onPress={() => onOpen(property.id)}
            accessibilityRole="button"
            accessibilityLabel={property.name}
            style={({ pressed }) => (pressed ? listItemStyles.pressed : undefined)}
          >
            <Card>
              <Text style={listItemStyles.name}>{property.name}</Text>
              <Text style={listItemStyles.address}>{property.address}</Text>
            </Card>
          </Pressable>
        ))
      )}
      <PrimaryButton title={t('properties.list.add')} onPress={onCreate} />
      <TextLink title={t('properties.list.openArchived')} onPress={onOpenArchived} />
    </KeyboardSafeContainer>
  );
}