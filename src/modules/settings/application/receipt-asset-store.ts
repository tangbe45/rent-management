import type { ReceiptAssetKind } from '../domain/landlord-settings';

/**
 * Durable image-store boundary for the landlord's optional logo, signature and
 * stamp assets. Files are copied into the application document directory and
 * survive restarts; cache paths are never used for permanent assets.
 */
export interface ReceiptAssetStore {
  import(sourceUri: string, kind: ReceiptAssetKind): Promise<string>;
  remove(fileName: string): void;
  exists(fileName: string): boolean;
  readBase64(fileName: string): Promise<string | null>;
}