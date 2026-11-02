/**
 * Reads a stored landlord asset (logo/signature/stamp) as base64 for embedding
 * in the receipt PDF. Returns null when the file is missing or unreadable so a
 * bad optional asset never blocks receipt generation.
 */
export interface ReceiptAssetReader {
  readBase64(fileName: string): Promise<string | null>;
}

/** Reads the single landlord's display name from the account. */
export interface LandlordIdentityLookup {
  findFullName(): string | null;
}