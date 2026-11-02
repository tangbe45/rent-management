import type { Clock } from '../../../shared/domain/clock';
import { LandlordSettings } from '../domain/landlord-settings';
import type { LandlordSettingsRepository } from '../domain/landlord-settings-repository';
import type { ReceiptAssetStore } from './receipt-asset-store';
import { SaveReceiptAsset } from './save-receipt-asset';

function createHarness(initial: LandlordSettings = LandlordSettings.defaults()) {
  const settings = {
    get: jest.fn(() => initial),
    save: jest.fn(),
  } as unknown as LandlordSettingsRepository;
  const assets = {
    import: jest.fn(async () => 'signature-new.png'),
    remove: jest.fn(),
    exists: jest.fn(),
    readBase64: jest.fn(),
  } as unknown as ReceiptAssetStore;
  const clock = { today: () => '2026-10-10', now: () => 42 } as Clock;
  const useCase = new SaveReceiptAsset({ settings, assets, clock });
  return { settings, assets, clock, useCase };
}

describe('SaveReceiptAsset', () => {
  it('imports first, then saves the settings with the asset and returns the next value', async () => {
    const { settings, assets, useCase } = createHarness();

    const next = await useCase.execute({ kind: 'signature', sourceUri: 'file:///cache/picked.png' });

    expect(assets.import).toHaveBeenCalledWith('file:///cache/picked.png', 'signature');
    expect(settings.save).toHaveBeenCalled();
    expect(next.value.signatureFileName).toBe('signature-new.png');
    expect(next.value.signatureMode).toBe('SAVED');
    expect(next.value.updatedAt).toBe(42);
    expect((jest.mocked(assets.import).mock.invocationCallOrder[0] ?? 0) < (jest.mocked(settings.save).mock.invocationCallOrder[0] ?? 0)).toBe(true);
  });

  it('removes the newly imported file when the settings save fails and rethrows', async () => {
    const { settings, assets, useCase } = createHarness();
    jest.mocked(settings.save).mockImplementation(() => {
      throw new Error('settings write failed');
    });

    await expect(useCase.execute({ kind: 'logo', sourceUri: 'file:///cache/picked.png' })).rejects.toThrow(
      'settings write failed',
    );
    expect(assets.remove).toHaveBeenCalledWith('signature-new.png');
  });

  it('removes the previous file only after a successful save', async () => {
    const initial = LandlordSettings.defaults().withAsset('signature', 'signature-old.png', 1);
    const { settings, assets, useCase } = createHarness(initial);

    await useCase.execute({ kind: 'signature', sourceUri: 'file:///cache/picked.png' });

    const saveIndex = jest.mocked(settings.save).mock.invocationCallOrder[0] ?? 0;
    const removeOld = jest.mocked(assets.remove).mock.calls.findIndex(([fileName]: [string]) => fileName === 'signature-old.png');
    expect(removeOld).toBeGreaterThanOrEqual(0);
    expect(jest.mocked(assets.remove).mock.invocationCallOrder[removeOld] ?? 0).toBeGreaterThan(saveIndex);
    expect(assets.remove).not.toHaveBeenCalledWith('signature-new.png');
  });

  it('does not remove the previous file when the previous file name is reused', async () => {
    const initial = LandlordSettings.defaults().withAsset('logo', 'logo-same.png', 1);
    const { assets, useCase } = createHarness(initial);
    jest.mocked(assets.import).mockResolvedValue('logo-same.png');

    await useCase.execute({ kind: 'logo', sourceUri: 'file:///cache/picked.png' });

    expect(assets.remove).not.toHaveBeenCalled();
  });

  it('does not treat an obsolete-file removal failure as a settings failure', async () => {
    const initial = LandlordSettings.defaults().withAsset('signature', 'signature-old.png', 1);
    const { assets, settings, useCase } = createHarness(initial);
    jest.mocked(assets.remove).mockImplementation(() => {
      throw new Error('file delete failed');
    });

    const next = await useCase.execute({ kind: 'signature', sourceUri: 'file:///cache/picked.png' });

    expect(settings.save).toHaveBeenCalled();
    expect(next.value.signatureFileName).toBe('signature-new.png');
    expect(next.value.signatureMode).toBe('SAVED');
  });
});
