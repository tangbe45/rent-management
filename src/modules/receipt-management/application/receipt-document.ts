import type { ReceiptSnapshotData } from '../domain/receipt-snapshot';

export interface ReceiptDocumentImage {
  fileName: string;
  base64: string;
}

export interface ReceiptDocumentAssets {
  logo: ReceiptDocumentImage | null;
  signature: ReceiptDocumentImage | null;
  stamp: ReceiptDocumentImage | null;
}

export interface ReceiptDocumentRenderInput {
  snapshot: ReceiptSnapshotData;
  assets: ReceiptDocumentAssets;
}

/** Renders the receipt HTML into a temporary PDF file. */
export interface ReceiptDocumentGenerator {
  generate(input: ReceiptDocumentRenderInput): Promise<{ uri: string; base64?: string }>;
}

export interface ReceiptDocumentVerification {
  exists: boolean;
  size: number;
}

/**
 * Durable storage for finalized receipt PDFs. Files live in the application
 * document directory and their stable relative reference is what the receipt
 * row stores; cache paths are never used for permanent documents. Persisting a
 * rendered source consumes it: once its bytes are durable, the temporary cache
 * file is removed on a best-effort basis and is never the finalized document.
 */
export interface ReceiptDocumentStore {
  persist(receiptId: string, source: { uri: string; base64?: string }): Promise<{ fileRef: string; size: number }>;
  remove(fileRef: string): void;
  locate(fileRef: string): string;
  verify(fileRef: string): ReceiptDocumentVerification;
  pruneOrphans(referencedFileRefs: readonly string[]): void;
}

export interface ReceiptPrinter {
  print(uri: string): Promise<void>;
}

export interface ReceiptSharer {
  isAvailable(): Promise<boolean>;
  share(uri: string): Promise<void>;
}