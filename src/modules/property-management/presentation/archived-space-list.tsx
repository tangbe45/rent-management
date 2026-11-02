import { Text } from 'react-native';

import { useTranslation } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { Card, KeyboardSafeContainer, styles } from '../../account/presentation/setup/setup-ui';
import type { PropertySpace } from '../domain/property-space';
import { listItemStyles } from './list-item-styles';
import { SecondaryButton, TextLink } from './property-ui';
import { spaceTypeEmoji, spaceTypeLabelKey } from './space-emoji';

interface ArchivedSpaceListProps {
  propertyName: string;
  spaces: readonly PropertySpace[];
  error?: string;
  onOpen: (id: string) => void;
  onRestore: (id: string) => void;
  onBack: () => void;
}

/**
 * Secondary view listing the archived spaces of a property. Archived spaces are
 * kept out of the active workspace tree; restoring keeps identity and never
 * cascades to descendants (archiving never cascaded either).
 */
export function ArchivedSpaceList({
  propertyName,
  spaces,
  error,
  onOpen,
  onRestore,
  onBack,
}: ArchivedSpaceListProps) {
  const { t } = useTranslation();

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>
        {`${conceptEmoji.archived} ${t('spaces.archived.title')}`}
      </Text>
      <Text style={styles.subtitle}>{propertyName}</Text>
      {spaces.length === 0 ? (
        <Text style={styles.subtitle}>{t('spaces.archived.empty')}</Text>
      ) : (
        spaces.map((space) => (
          <Card key={space.id}>
            <Text style={listItemStyles.name}>{space.name}</Text>
            <Text style={listItemStyles.address}>
              {`${spaceTypeEmoji(space.type)} ${t(spaceTypeLabelKey(space.type))}`}
            </Text>
            <SecondaryButton title={t('spaces.action.open')} onPress={() => onOpen(space.id)} />
            <SecondaryButton
              title={t('spaces.action.restore')}
              onPress={() => onRestore(space.id)}
            />
          </Card>
        ))
      )}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      <TextLink title={t('common.back')} onPress={onBack} />
    </KeyboardSafeContainer>
  );
}
