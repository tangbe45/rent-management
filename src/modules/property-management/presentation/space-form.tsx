import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation, type TranslationKey } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import {
  Card,
  KeyboardSafeContainer,
  PrimaryButton,
  palette,
  spacing,
  styles,
} from '../../account/presentation/setup/setup-ui';
import {
  PROPERTY_SPACE_NAME_MAX_LENGTH,
  PROPERTY_SPACE_TYPES,
  type PropertySpaceType,
} from '../domain/property-space';
import { SecondaryButton } from './property-ui';
import { spaceTypeEmoji, spaceTypeLabelKey } from './space-emoji';

export type SpaceFormMode = 'create' | 'edit';

export interface SpaceFormValues {
  name: string;
  type: PropertySpaceType;
  parentSpaceId: string | null;
  rentable: boolean;
}

export interface SpaceParentOption {
  id: string;
  name: string;
  type: PropertySpaceType;
  depth: number;
}

interface SpaceFormProps {
  mode: SpaceFormMode;
  propertyName?: string;
  initialValues?: Partial<SpaceFormValues>;
  parentOptions: readonly SpaceParentOption[];
  error?: string;
  onSubmit: (values: SpaceFormValues) => void;
  onCancel: () => void;
}

const DEFAULT_TYPE: PropertySpaceType = 'ROOM';

function spaceTypePlaceholderKey(type: PropertySpaceType): TranslationKey {
  return `spaces.form.placeholder.${type}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={formStyles.section}>
      <Text style={formStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function SpaceForm({
  mode,
  propertyName,
  initialValues,
  parentOptions,
  error,
  onSubmit,
  onCancel,
}: SpaceFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [type, setType] = useState<PropertySpaceType>(initialValues?.type ?? DEFAULT_TYPE);
  const [parentSpaceId, setParentSpaceId] = useState<string | null>(
    initialValues?.parentSpaceId ?? null,
  );
  const [rentable, setRentable] = useState(initialValues?.rentable ?? false);
  const [nameError, setNameError] = useState<string | undefined>();

  const parentLabel =
    parentOptions.find((option) => option.id === parentSpaceId)?.name ??
    t('spaces.form.parentTopLevel');

  const handleSubmit = () => {
    if (name.trim().length === 0) {
      setNameError(t('spaces.validation.nameRequired'));
      return;
    }
    setNameError(undefined);
    onSubmit({ name, type, parentSpaceId, rentable });
  };

  return (
    <KeyboardSafeContainer>
      <Text style={styles.title}>
        {`${conceptEmoji.spaces} ${mode === 'create' ? t('spaces.create.title') : t('spaces.edit.title')}`}
      </Text>
      {mode === 'create' && propertyName ? (
        <Text style={styles.subtitle}>{t('spaces.form.context', { property: propertyName })}</Text>
      ) : null}
      <Card>
        <Section title={t('spaces.form.typeSection')}>
          <View style={formStyles.typeGrid}>
            {PROPERTY_SPACE_TYPES.map((candidate) => {
              const selected = candidate === type;
              const label = t(spaceTypeLabelKey(candidate));
              return (
                <Pressable
                  key={candidate}
                  onPress={() => setType(candidate)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  style={[formStyles.typeTile, selected ? formStyles.typeTileSelected : null]}
                >
                  <Text style={formStyles.typeEmoji}>{spaceTypeEmoji(candidate)}</Text>
                  <Text
                    numberOfLines={1}
                    style={[formStyles.typeLabel, selected ? formStyles.typeLabelSelected : null]}
                  >
                    {label}
                  </Text>
                  {selected ? (
                    <Text style={formStyles.typeCheck}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title={t('spaces.form.nameSection')}>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={PROPERTY_SPACE_NAME_MAX_LENGTH}
            placeholder={t(spaceTypePlaceholderKey(type))}
            placeholderTextColor={palette.textMuted}
            accessibilityLabel={t('spaces.form.nameSection')}
            style={[styles.input, nameError ? styles.inputError : null]}
          />
          {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
        </Section>

        <Section title={t('spaces.form.parentSection')}>
          <Text style={formStyles.helper}>{t('spaces.form.parentHelper')}</Text>
          <View style={formStyles.options}>
            <Pressable
              onPress={() => setParentSpaceId(null)}
              accessibilityRole="button"
              accessibilityLabel={t('spaces.form.parentTopLevel')}
              accessibilityState={{ selected: parentSpaceId === null }}
              style={[
                formStyles.option,
                parentSpaceId === null ? formStyles.optionSelected : null,
              ]}
            >
              <View style={formStyles.optionRow}>
                <Text style={formStyles.optionEmoji}>{conceptEmoji.properties}</Text>
                <View style={formStyles.optionTextWrap}>
                  <Text style={formStyles.optionText}>
                    {propertyName ?? t('spaces.form.parentTopLevel')}
                  </Text>
                  <Text style={formStyles.optionSubtext}>{t('spaces.form.propertyType')}</Text>
                </View>
              </View>
              <Text style={formStyles.optionHint}>{t('spaces.form.parentTopLevel')}</Text>
            </Pressable>
            {parentOptions.map((option) => {
              const selected = option.id === parentSpaceId;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setParentSpaceId(option.id)}
                  accessibilityRole="button"
                  accessibilityLabel={option.name}
                  accessibilityState={{ selected }}
                  style={[
                    formStyles.option,
                    { marginLeft: (option.depth + 1) * spacing.m },
                    selected ? formStyles.optionSelected : null,
                  ]}
                >
                  <View style={formStyles.optionRow}>
                    <Text style={formStyles.optionEmoji}>{spaceTypeEmoji(option.type)}</Text>
                    <Text style={formStyles.optionText}>{option.name}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title={t('spaces.form.rentableSection')}>
          <Pressable
            onPress={() => setRentable(true)}
            accessibilityRole="radio"
            accessibilityLabel={t('spaces.form.rentableYes')}
            accessibilityState={{ selected: rentable, checked: rentable }}
            style={[formStyles.rentOption, rentable ? formStyles.optionSelected : null]}
          >
            <Text style={formStyles.rentTitle}>{t('spaces.form.rentableYes')}</Text>
            <Text style={formStyles.helper}>{t('spaces.form.rentableYesHint')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setRentable(false)}
            accessibilityRole="radio"
            accessibilityLabel={t('spaces.form.rentableNo')}
            accessibilityState={{ selected: !rentable, checked: !rentable }}
            style={[formStyles.rentOption, !rentable ? formStyles.optionSelected : null]}
          >
            <Text style={formStyles.rentTitle}>{t('spaces.form.rentableNo')}</Text>
            <Text style={formStyles.helper}>{t('spaces.form.rentableNoHint')}</Text>
          </Pressable>
        </Section>

        <View style={formStyles.summary}>
          <Text style={formStyles.summaryTitle}>
            {`${spaceTypeEmoji(type)} ${name.trim().length > 0 ? name : t(spaceTypeLabelKey(type))}`}
          </Text>
          <Text style={formStyles.summaryLine}>
            {`${parentLabel} · ${
              rentable
                ? t('spaces.form.summaryRentable')
                : t('spaces.form.summaryNotRentable')
            }`}
          </Text>
        </View>

        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        <PrimaryButton
          title={mode === 'create' ? t('spaces.form.saveCreate') : t('spaces.form.saveEdit')}
          onPress={handleSubmit}
        />
        <SecondaryButton title={t('common.cancel')} onPress={onCancel} />
      </Card>
    </KeyboardSafeContainer>
  );
}

const formStyles = StyleSheet.create({
  section: {
    gap: spacing.s,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.text,
  },
  helper: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  typeTile: {
    flexGrow: 1,
    flexBasis: '45%',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.s,
    backgroundColor: palette.background,
    alignItems: 'center',
    gap: spacing.xs,
  },
  typeTileSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  typeEmoji: {
    fontSize: 24,
  },
  typeLabel: {
    fontSize: 14,
    color: palette.text,
  },
  typeLabelSelected: {
    color: palette.primary,
    fontWeight: '700',
  },
  typeCheck: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.s,
    fontSize: 14,
    color: palette.primary,
    fontWeight: '700',
  },
  options: {
    gap: spacing.xs,
  },
  option: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: spacing.m,
    paddingVertical: 10,
    backgroundColor: palette.background,
  },
  optionSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  optionEmoji: {
    fontSize: 18,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionText: {
    fontSize: 15,
    color: palette.text,
  },
  optionSubtext: {
    fontSize: 13,
    color: palette.textMuted,
  },
  optionHint: {
    marginTop: spacing.xs,
    marginLeft: spacing.m + spacing.s,
    fontSize: 13,
    color: palette.textMuted,
  },
  rentOption: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    backgroundColor: palette.background,
    gap: spacing.xs,
  },
  rentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  summary: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: spacing.m,
    gap: spacing.xs,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  summaryLine: {
    fontSize: 13,
    color: palette.textMuted,
  },
});
