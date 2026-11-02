import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useTranslation, type TranslationKey } from '../../../shared/i18n';
import { conceptEmoji } from '../../../shared/presentation/emojis';
import { getOwnerProfile } from '../../account/infrastructure/composition-root';
import { Card, palette, PrimaryButton, styles } from '../../account/presentation/setup/setup-ui';
import {
  InvalidLandlordSettingsError,
  MAX_ADDRESS,
  MAX_EMAIL,
  MAX_PHONE,
  type LandlordSettings,
  type ReceiptAssetKind,
  type ReceiptSigningMode,
} from '../domain/landlord-settings';
import {
  getLandlordSettings,
  removeReceiptAsset,
  saveReceiptAsset,
  updateLandlordSettings,
} from '../infrastructure/composition-root';
import { SecondaryButton, TextLink } from '../../rent-payment-management/presentation/rent-ui';

function modeLabelKey(mode: ReceiptSigningMode): TranslationKey {
  return mode === 'SAVED' ? 'settings.signing.saved' : 'settings.signing.manual';
}

function errorKeyFor(caught: unknown): TranslationKey {
  if (caught instanceof InvalidLandlordSettingsError) {
    if (caught.message === 'tooLong') {
      return 'settings.landlord.tooLong';
    }
    if (caught.message === 'email') {
      return 'settings.landlord.emailInvalid';
    }
    if (caught.message === 'phone') {
      return 'settings.landlord.phoneInvalid';
    }
    return 'settings.error.generic';
  }
  return 'settings.error.generic';
}

interface AssetField {
  kind: ReceiptAssetKind;
  labelKey: TranslationKey;
  hasImage: boolean;
}

/**
 * Receipt settings slice: the landlord's contact details (printed on every
 * receipt) and the logo/signature/stamp appearance. The landlord's name stays
 * on the account, so it is only shown here.
 */
export function SettingsScreen() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<LandlordSettings>(() => getLandlordSettings.execute());
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [phone, setPhone] = useState(settings.value.landlordPhone ?? '');
  const [email, setEmail] = useState(settings.value.landlordEmail ?? '');
  const [address, setAddress] = useState(settings.value.landlordAddress ?? '');
  const [signatureMode, setSignatureMode] = useState<ReceiptSigningMode>(
    settings.value.signatureMode,
  );
  const [stampMode, setStampMode] = useState<ReceiptSigningMode>(settings.value.stampMode);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    getOwnerProfile
      .execute()
      .then((profile) => {
        if (active) {
          setOwnerName(profile?.fullName ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setOwnerName(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const apply = (next: LandlordSettings) => {
    setSettings(next);
    setPhone(next.value.landlordPhone ?? '');
    setEmail(next.value.landlordEmail ?? '');
    setAddress(next.value.landlordAddress ?? '');
    setSignatureMode(next.value.signatureMode);
    setStampMode(next.value.stampMode);
  };

  const saveDetails = () => {
    setError(undefined);
    setNotice(undefined);
    try {
      apply(
        updateLandlordSettings.execute({
          landlordPhone: phone,
          landlordEmail: email,
          landlordAddress: address,
          signatureMode,
          stampMode,
        }),
      );
      setNotice(t('settings.landlord.saved'));
    } catch (caught) {
      setError(t(errorKeyFor(caught)));
    }
  };

  const chooseImage = async (kind: ReceiptAssetKind) => {
    setError(undefined);
    setNotice(undefined);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
      if (picked.canceled || picked.assets.length === 0) {
        return;
      }
      const sourceUri = picked.assets[0]?.uri;
      if (sourceUri === undefined) {
        return;
      }
      const next = await saveReceiptAsset.execute({ kind, sourceUri });
      apply(next);
      setNotice(t('settings.asset.saved'));
    } catch (caught) {
      setError(t(errorKeyFor(caught)));
    }
  };

  const removeImage = (kind: ReceiptAssetKind) => {
    setError(undefined);
    setNotice(undefined);
    try {
      apply(removeReceiptAsset.execute(kind));
      setNotice(t('settings.asset.removed'));
    } catch (caught) {
      setError(t(errorKeyFor(caught)));
    }
  };

  const assetFields: AssetField[] = [
    { kind: 'logo', labelKey: 'settings.logo.label', hasImage: settings.value.logoFileName !== null },
    {
      kind: 'signature',
      labelKey: 'settings.signature.label',
      hasImage: settings.value.signatureFileName !== null,
    },
    {
      kind: 'stamp',
      labelKey: 'settings.stamp.label',
      hasImage: settings.value.stampFileName !== null,
    },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={settingsStyles.content}>
      <Text style={styles.title}>{`${conceptEmoji.settings} ${t('settings.title')}`}</Text>

      <Card>
        <Text style={settingsStyles.sectionTitle}>{t('settings.landlord.title')}</Text>
        <Text style={settingsStyles.fieldLabel}>{t('settings.landlord.name')}</Text>
        <Text style={settingsStyles.nameValue}>{ownerName ?? '—'}</Text>
        <Text style={settingsStyles.hint}>{t('settings.landlord.nameHint')}</Text>

        <Text style={settingsStyles.fieldLabel}>{t('settings.landlord.phone')}</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder={t('settings.landlord.phonePlaceholder')}
          accessibilityLabel={t('settings.landlord.phone')}
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={MAX_PHONE}
        />

        <Text style={settingsStyles.fieldLabel}>{t('settings.landlord.email')}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('settings.landlord.emailPlaceholder')}
          accessibilityLabel={t('settings.landlord.email')}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          maxLength={MAX_EMAIL}
        />

        <Text style={settingsStyles.fieldLabel}>{t('settings.landlord.address')}</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder={t('settings.landlord.addressPlaceholder')}
          accessibilityLabel={t('settings.landlord.address')}
          style={styles.input}
          multiline
          maxLength={MAX_ADDRESS}
        />
      </Card>

      <Card>
        <Text style={settingsStyles.sectionTitle}>{t('settings.appearance.title')}</Text>
        <Text style={settingsStyles.hint}>{t('settings.appearance.prompt')}</Text>

        {assetFields.map((field) => (
          <View key={field.kind} style={settingsStyles.assetBlock}>
            <View style={settingsStyles.assetHeader}>
              <Text style={settingsStyles.fieldLabel}>{t(field.labelKey)}</Text>
              <Text style={settingsStyles.hint}>
                {field.hasImage ? t('settings.asset.saved') : t('settings.asset.notChosen')}
              </Text>
            </View>
            <View style={settingsStyles.assetActions}>
              <SecondaryButton
                title={field.hasImage ? t('settings.asset.change') : t('settings.asset.choose')}
                onPress={() => void chooseImage(field.kind)}
              />
              {field.hasImage ? (
                <Pressable
                  onPress={() => removeImage(field.kind)}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.asset.remove')}
                >
                  <Text style={settingsStyles.remove}>{t('settings.asset.remove')}</Text>
                </Pressable>
              ) : null}
            </View>
            {field.kind !== 'logo' ? (
              <View style={settingsStyles.modes}>
                {(['SAVED', 'MANUAL'] as const).map((mode) => {
                  const selected =
                    field.kind === 'signature' ? signatureMode === mode : stampMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() =>
                        field.kind === 'signature' ? setSignatureMode(mode) : setStampMode(mode)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={t(modeLabelKey(mode))}
                      style={[settingsStyles.mode, selected ? settingsStyles.modeSelected : null]}
                    >
                      <Text
                        style={
                          selected ? settingsStyles.modeTextSelected : settingsStyles.modeText
                        }
                      >
                        {t(modeLabelKey(mode))}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ))}
        <Text style={settingsStyles.hint}>{t('settings.signing.manualHint')}</Text>
      </Card>

      {error !== undefined ? <Text style={settingsStyles.error}>{error}</Text> : null}
      {notice !== undefined ? <Text style={settingsStyles.notice}>{notice}</Text> : null}

      <PrimaryButton title={t('settings.landlord.save')} onPress={saveDetails} />
      <TextLink title={t('common.back')} onPress={() => router.back()} />
    </ScrollView>
  );
}

const settingsStyles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
    marginTop: 12,
  },
  nameValue: {
    fontSize: 16,
    color: palette.text,
  },
  hint: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  assetBlock: {
    marginTop: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingBottom: 12,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  assetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  remove: {
    color: palette.danger,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
  },
  modes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mode: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.background,
  },
  modeSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  modeText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  modeTextSelected: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  notice: {
    color: palette.primary,
    fontSize: 14,
    lineHeight: 20,
  },
});