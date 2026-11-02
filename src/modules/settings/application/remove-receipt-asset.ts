import type { Clock } from '../../../shared/domain/clock';
import type { ReceiptAssetKind, LandlordSettings } from '../domain/landlord-settings';
import type { LandlordSettingsRepository } from '../domain/landlord-settings-repository';
import type { ReceiptAssetStore } from './receipt-asset-store';

export class RemoveReceiptAsset {
  constructor(
    private readonly deps: {
      settings: LandlordSettingsRepository;
      assets: ReceiptAssetStore;
      clock: Clock;
    },
  ) {}

  execute(kind: ReceiptAssetKind): LandlordSettings {
    const current = this.deps.settings.get();
    const previous = current.fileNameFor(kind);
    const next = current.removeAsset(kind, this.deps.clock.now());
    this.deps.settings.save(next);
    if (previous !== null) {
      try {
        this.deps.assets.remove(previous);
      } catch {
        // Best-effort cleanup: the cleared settings are already persisted; a
        // stale orphan file must never misrepresent a successful save.
      }
    }
    return next;
  }
}