import { database } from '../../../shared/infrastructure/database/connection';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { GetLandlordSettings } from '../application/get-landlord-settings';
import { RemoveReceiptAsset } from '../application/remove-receipt-asset';
import { SaveReceiptAsset } from '../application/save-receipt-asset';
import { UpdateLandlordSettings } from '../application/update-landlord-settings';
import { DrizzleLandlordSettingsRepository } from './drizzle-landlord-settings-repository';
import { ExpoReceiptAssetStore } from './expo-receipt-asset-store';

const clock = new SystemClock();

export const landlordSettingsRepository = new DrizzleLandlordSettingsRepository(database);
export const receiptAssetStore = new ExpoReceiptAssetStore();

export const getLandlordSettings = new GetLandlordSettings({
  settings: landlordSettingsRepository,
});

export const updateLandlordSettings = new UpdateLandlordSettings({
  settings: landlordSettingsRepository,
  clock,
});

export const saveReceiptAsset = new SaveReceiptAsset({
  settings: landlordSettingsRepository,
  assets: receiptAssetStore,
  clock,
});

export const removeReceiptAsset = new RemoveReceiptAsset({
  settings: landlordSettingsRepository,
  assets: receiptAssetStore,
  clock,
});