import type { Clock } from '../../../shared/domain/clock';
import { LandlordSettings } from '../domain/landlord-settings';
import type { LandlordSettingsRepository } from '../domain/landlord-settings-repository';
import type { ReceiptAssetStore } from './receipt-asset-store';
import { RemoveReceiptAsset } from './remove-receipt-asset';

function createHarness(initial: LandlordSettings = LandlordSettings.defaults()) {
  const settings = {
    get: jest.fn(() => initial),
    save: jest.fn(),
  } as unknown as LandlordSettingsRepository;
  const assets = {
    import: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
    readBase64: jest.fn(),
  } as unknown as ReceiptAssetStore;
  const clock = { today: () => '2026-10-10', now: () => 42 } as Clock;
  const useCase = new RemoveReceiptAsset({ settings, assets, clock });
  return { settings, assets, clock, useCase };
}

describe('RemoveReceiptAsset', () => {
  it('clears the reference, saves, then removes the obsolete file', () => {
    const initial = LandlordSettings.defaults().withAsset('logo', 'logo-1.png', 1);
    const { settings, assets, useCase } = createHarness(initial);

    const next = useCase.execute('logo');

    expect(next.value.logoFileName).toBeNull();
    expect(next.value.updatedAt).toBe(42);
    expect(settings.save).toHaveBeenCalledWith(next);
    expect(assets.remove).toHaveBeenCalledWith('logo-1.png');
    const saveIndex = jest.mocked(settings.save).mock.invocationCallOrder[0] ?? 0;
    const removeIndex = jest.mocked(assets.remove).mock.invocationCallOrder[0] ?? 0;
    expect(removeIndex).toBeGreaterThan(saveIndex);
  });

  it('clears a signature and resets its mode to MANUAL', () => {
    const initial = LandlordSettings.defaults().withAsset('signature', 'signature-1.png', 1);
    const { settings, assets, useCase } = createHarness(initial);

    const next = useCase.execute('signature');

    expect(next.value.signatureFileName).toBeNull();
    expect(next.value.signatureMode).toBe('MANUAL');
    expect(settings.save).toHaveBeenCalled();
    expect(assets.remove).toHaveBeenCalledWith('signature-1.png');
  });

  it('does not remove any file when no asset was configured', () => {
    const { assets, useCase } = createHarness();

    const next = useCase.execute('stamp');

    expect(next.value.stampFileName).toBeNull();
    expect(assets.remove).not.toHaveBeenCalled();
  });

  it('does not treat an obsolete-file removal failure as a settings failure', () => {
    const initial = LandlordSettings.defaults().withAsset('stamp', 'stamp-1.png', 1);
    const { settings, assets, useCase } = createHarness(initial);
    jest.mocked(assets.remove).mockImplementation(() => {
      throw new Error('file delete failed');
    });

    const next = useCase.execute('stamp');

    expect(settings.save).toHaveBeenCalled();
    expect(next.value.stampFileName).toBeNull();
    expect(next.value.stampMode).toBe('MANUAL');
  });
});
