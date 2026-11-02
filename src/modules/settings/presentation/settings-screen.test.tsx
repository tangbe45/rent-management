import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import * as ImagePicker from 'expo-image-picker';
import { setLocale } from '../../../shared/i18n';
import { getOwnerProfile } from '../../account/infrastructure/composition-root';
import {
  getLandlordSettings,
  removeReceiptAsset,
  saveReceiptAsset,
  updateLandlordSettings,
} from '../infrastructure/composition-root';
import { InvalidLandlordSettingsError, LandlordSettings } from '../domain/landlord-settings';
import { SettingsScreen } from './settings-screen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../../account/infrastructure/composition-root', () => ({
  getOwnerProfile: { execute: jest.fn() },
}));

jest.mock('../infrastructure/composition-root', () => ({
  getLandlordSettings: { execute: jest.fn() },
  removeReceiptAsset: { execute: jest.fn() },
  saveReceiptAsset: { execute: jest.fn() },
  updateLandlordSettings: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function baseSettings(): LandlordSettings {
  return LandlordSettings.defaults().withContact(
    {
      landlordPhone: '+237 600 000 000',
      landlordEmail: 'landlord@example.com',
      landlordAddress: 'Yaoundé',
    },
    5,
  );
}

function buttons(root: ReactTestInstance, label: string): ReactTestInstance[] {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
}

function pressButton(root: ReactTestInstance, label: string, index = 0): void {
  buttons(root, label)[index]!.props.onPress();
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === message);
}

function textInputs(root: ReactTestInstance): {
  value: string;
  onChangeText: (value: string) => void;
  maxLength?: number;
}[] {
  return root.findAllByType(TextInput).map((instance) => instance.props as {
    value: string;
    onChangeText: (value: string) => void;
    maxLength?: number;
  });
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<SettingsScreen />);
  });
  return renderer;
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    setLocale('en');
    jest.clearAllMocks();
    jest.mocked(getOwnerProfile.execute).mockResolvedValue({ fullName: 'Landlord Name' });
    jest.mocked(getLandlordSettings.execute).mockReturnValue(baseSettings());
    jest.mocked(updateLandlordSettings.execute).mockReturnValue(baseSettings());
  });

  it('shows the owner name read-only from the account profile', async () => {
    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Landlord Name')).toBe(true);
    expect(textShown(renderer.root, '—')).toBe(false);
  });

  it('falls back to a dash when no account profile exists', async () => {
    jest.mocked(getOwnerProfile.execute).mockResolvedValue(null);
    const renderer = await renderScreen();
    expect(textShown(renderer.root, '—')).toBe(true);
  });

  it('initializes the contact fields and signing modes from the loaded settings', async () => {
    jest.mocked(getLandlordSettings.execute).mockReturnValue(
      baseSettings().withSigningMode('signature', 'SAVED', 6),
    );
    const renderer = await renderScreen();

    const [phone, email, address] = textInputs(renderer.root);
    expect(phone?.value).toBe('+237 600 000 000');
    expect(email?.value).toBe('landlord@example.com');
    expect(address?.value).toBe('Yaoundé');

    await act(async () => {
      pressButton(renderer.root, 'Save details');
    });

    expect(updateLandlordSettings.execute).toHaveBeenCalledWith({
      landlordPhone: '+237 600 000 000',
      landlordEmail: 'landlord@example.com',
      landlordAddress: 'Yaoundé',
      signatureMode: 'SAVED',
      stampMode: 'MANUAL',
    });
  });

  it('submits the entered values, keeps modes independent and shows the confirmation', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      const [phone, email, address] = textInputs(renderer.root);
      phone?.onChangeText('+237 700 000 000');
      email?.onChangeText('Owner@Example.org');
      address?.onChangeText('Douala');
      pressButton(renderer.root, 'Use a saved image', 0);
    });
    await act(async () => {
      pressButton(renderer.root, 'Save details');
    });

    expect(updateLandlordSettings.execute).toHaveBeenCalledWith({
      landlordPhone: '+237 700 000 000',
      landlordEmail: 'Owner@Example.org',
      landlordAddress: 'Douala',
      signatureMode: 'SAVED',
      stampMode: 'MANUAL',
    });
    expect(textShown(renderer.root, 'Details saved.')).toBe(true);
  });

  it('submits a SAVED stamp mode independently of the signature', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      pressButton(renderer.root, 'Use a saved image', 1);
    });
    await act(async () => {
      pressButton(renderer.root, 'Save details');
    });

    expect(updateLandlordSettings.execute).toHaveBeenCalledWith({
      landlordPhone: '+237 600 000 000',
      landlordEmail: 'landlord@example.com',
      landlordAddress: 'Yaoundé',
      signatureMode: 'MANUAL',
      stampMode: 'SAVED',
    });
  });

  it('limits contact input lengths to the domain rules', async () => {
    const renderer = await renderScreen();
    const [phone, email, address] = textInputs(renderer.root);
    expect(phone?.maxLength).toBe(30);
    expect(email?.maxLength).toBe(120);
    expect(address?.maxLength).toBe(200);
  });

  it('shows the localized email validation message', async () => {
    jest.mocked(updateLandlordSettings.execute).mockImplementation(() => {
      throw new InvalidLandlordSettingsError('email');
    });
    const renderer = await renderScreen();

    await act(async () => {
      pressButton(renderer.root, 'Save details');
    });

    expect(textShown(renderer.root, 'Enter a valid email address.')).toBe(true);
    expect(textShown(renderer.root, 'Details saved.')).toBe(false);
  });

  it('shows the localized phone validation message', async () => {
    jest.mocked(updateLandlordSettings.execute).mockImplementation(() => {
      throw new InvalidLandlordSettingsError('phone');
    });
    const renderer = await renderScreen();

    await act(async () => {
      pressButton(renderer.root, 'Save details');
    });

    expect(textShown(renderer.root, 'Enter a valid phone number.')).toBe(true);
  });

  it('shows a specific message for an over-length field', async () => {
    jest.mocked(updateLandlordSettings.execute).mockImplementation(() => {
      throw new InvalidLandlordSettingsError('tooLong');
    });
    const renderer = await renderScreen();

    await act(async () => {
      pressButton(renderer.root, 'Save details');
    });

    expect(textShown(renderer.root, 'One of the entered fields is too long.')).toBe(true);
  });

  it('shows the generic message for other failures', async () => {
    jest.mocked(updateLandlordSettings.execute).mockImplementation(() => {
      throw new Error('boom');
    });
    const renderer = await renderScreen();

    await act(async () => {
      pressButton(renderer.root, 'Save details');
    });

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
  });

  it('chooses a signature image and applies the returned settings', async () => {
    jest.mocked(getLandlordSettings.execute).mockReturnValue(
      baseSettings().withAsset('logo', 'logo-1.png', 1).withAsset('stamp', 'stamp-1.png', 2),
    );
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/picked.png', width: 100, height: 100 }],
    });
    jest.mocked(saveReceiptAsset.execute).mockResolvedValue(
      baseSettings()
        .withAsset('logo', 'logo-1.png', 1)
        .withAsset('stamp', 'stamp-1.png', 2)
        .withAsset('signature', 'signature-1.png', 3),
    );
    const renderer = await renderScreen();

    await act(async () => {
      pressButton(renderer.root, 'Choose image');
    });

    expect(saveReceiptAsset.execute).toHaveBeenCalledWith({
      kind: 'signature',
      sourceUri: 'file:///cache/picked.png',
    });
    expect(textShown(renderer.root, 'Image saved.')).toBe(true);
    expect(buttons(renderer.root, 'Choose image')).toHaveLength(0);
    expect(buttons(renderer.root, 'Change image')).toHaveLength(3);
  });

  it('does nothing when the image picker is cancelled', async () => {
    jest.mocked(getLandlordSettings.execute).mockReturnValue(
      baseSettings().withAsset('logo', 'logo-1.png', 1).withAsset('stamp', 'stamp-1.png', 2),
    );
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null });
    const renderer = await renderScreen();

    await act(async () => {
      pressButton(renderer.root, 'Choose image');
    });

    expect(saveReceiptAsset.execute).not.toHaveBeenCalled();
    expect(buttons(renderer.root, 'Choose image')).toHaveLength(1);
  });

  it('removes a saved signature and applies the returned settings', async () => {
    const withSignature = baseSettings().withAsset('signature', 'signature-1.png', 1);
    jest.mocked(getLandlordSettings.execute).mockReturnValue(withSignature);
    jest.mocked(removeReceiptAsset.execute).mockReturnValue(withSignature.removeAsset('signature', 2));
    const renderer = await renderScreen();

    await act(async () => {
      pressButton(renderer.root, 'Remove');
    });

    expect(removeReceiptAsset.execute).toHaveBeenCalledWith('signature');
    expect(textShown(renderer.root, 'Image removed.')).toBe(true);
    expect(buttons(renderer.root, 'Remove')).toHaveLength(0);
  });
});
