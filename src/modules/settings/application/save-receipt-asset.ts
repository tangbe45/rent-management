import type { Clock } from '../../../shared/domain/clock';
import type { ReceiptAssetKind, LandlordSettings } from '../domain/landlord-settings';
import type { LandlordSettingsRepository } from '../domain/landlord-settings-repository';
import type { ReceiptAssetStore } from './receipt-asset-store';

/**
 * Copies a picked image into durable storage and records its file name on the
 * settings row. If the settings save fails, the copied file is removed so no
 * orphan reference or file remains behind.
 */
export class SaveReceiptAsset {
  constructor(
    private readonly deps: {
      settings: LandlordSettingsRepository;
      assets: ReceiptAssetStore;
      clock: Clock;
    },
  ) {}

  async execute(input: { kind: ReceiptAssetKind; sourceUri: string }): Promise<LandlordSettings> {
    const fileName = await this.deps.assets.import(input.sourceUri, input.kind);
    const current = this.deps.settings.get();
    const previous = current.fileNameFor(input.kind);
    const next = current.withAsset(input.kind, fileName, this.deps.clock.now());
    try {
      this.deps.settings.save(next);
    } catch (error) {
      this.deps.assets.remove(fileName);
      throw error;
    }
    if (previous !== null && previous !== fileName) {
      try {
        this.deps.assets.remove(previous);
      } catch {
        // Best-effort cleanup: the new settings are already persisted; a stale
        // orphan file must never misrepresent a successful save.
      }
    }
    return next;
  }
}