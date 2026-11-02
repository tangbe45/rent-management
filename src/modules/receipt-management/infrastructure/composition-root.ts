import { database } from '../../../shared/infrastructure/database/connection';
import { ExpoCryptoIdGenerator } from '../../../shared/infrastructure/id-generator';
import { SystemClock } from '../../../shared/infrastructure/system-clock';
import { subscriptionAccessPolicy } from '../../subscription/infrastructure/composition-root';
import { landlordSettingsRepository, receiptAssetStore } from '../../settings/infrastructure/composition-root';
import { GenerateReceipt } from '../application/generate-receipt';
import { GetReceipt, GetReceiptForPayment } from '../application/get-receipt';
import { ListReceipts } from '../application/list-receipts';
import { PrintReceipt } from '../application/print-receipt';
import { ShareReceipt } from '../application/share-receipt';
import { DrizzleLandlordIdentityLookup } from './drizzle-landlord-identity-lookup';
import { DrizzleReceiptContextLookup } from './drizzle-receipt-context-lookup';
import { DrizzleReceiptRepository } from './drizzle-receipt-repository';
import { DrizzleReceiptUnitOfWork } from './drizzle-receipt-unit-of-work';
import { ExpoPrintReceiptDocumentGenerator } from './expo-print-receipt-document-generator';
import { ExpoReceiptDocumentStore } from './expo-receipt-document-store';
import { ExpoReceiptPrinter } from './expo-receipt-printer';
import { ExpoReceiptSharer } from './expo-receipt-sharer';

const clock = new SystemClock();
const idGenerator = new ExpoCryptoIdGenerator();
const documentStore = new ExpoReceiptDocumentStore();

export const receiptContextLookup = new DrizzleReceiptContextLookup(database);
const generatedReceipts = new DrizzleReceiptRepository(database);

export const generateReceipt = new GenerateReceipt({
  unitOfWork: new DrizzleReceiptUnitOfWork(),
  context: receiptContextLookup,
  settings: landlordSettingsRepository,
  identity: new DrizzleLandlordIdentityLookup(database),
  assets: receiptAssetStore,
  documents: documentStore,
  generator: new ExpoPrintReceiptDocumentGenerator(),
  entitlement: subscriptionAccessPolicy,
  idGenerator,
  clock,
});

export const getReceipt = new GetReceipt({
  receipts: generatedReceipts,
  context: receiptContextLookup,
});

export const getReceiptForPayment = new GetReceiptForPayment({
  receipts: generatedReceipts,
  context: receiptContextLookup,
});

export const listReceipts = new ListReceipts({
  receipts: generatedReceipts,
  context: receiptContextLookup,
});

export const printReceipt = new PrintReceipt({
  documents: documentStore,
  printer: new ExpoReceiptPrinter(),
});

export const shareReceipt = new ShareReceipt({
  documents: documentStore,
  sharer: new ExpoReceiptSharer(),
});