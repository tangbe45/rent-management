import { Directory, EncodingType, File, Paths } from 'expo-file-system';

import type {
  ReceiptDocumentStore,
  ReceiptDocumentVerification,
} from '../application/receipt-document';

const RECEIPTS_DIRECTORY = 'receipts';

/**
 * Stores finalized receipt PDFs under the app's document directory. A receipt
 * is only ever finalized against a file that is written here (never into the
 * cache), and the durable relative reference (`receipts/<id>.pdf`) is what the
 * receipt row persists.
 */
export class ExpoReceiptDocumentStore implements ReceiptDocumentStore {
  private directory(): Directory {
    const directory = new Directory(Paths.document, RECEIPTS_DIRECTORY);
    if (!directory.exists) {
      directory.create();
    }
    return directory;
  }

  private fileFor(fileRef: string): File {
    const fileName = fileRef.replace(`${RECEIPTS_DIRECTORY}/`, '');
    return new File(this.directory(), fileName);
  }

  async persist(
    receiptId: string,
    source: { uri: string; base64?: string },
  ): Promise<{ fileRef: string; size: number }> {
    const fileName = `${receiptId}.pdf`;
    const target = new File(this.directory(), fileName);
    if (source.base64) {
      if (!target.exists) {
        target.create({ intermediates: true });
      }
      target.write(source.base64, { encoding: EncodingType.Base64 });
    } else if (source.uri && source.uri !== target.uri) {
      const sourceFile = new File(source.uri);
      await sourceFile.move(target);
    }
    this.discardTemporary(source.uri, target.uri);
    return {
      fileRef: `${RECEIPTS_DIRECTORY}/${fileName}`,
      size: target.exists ? target.size : 0,
    };
  }

  /**
   * Best-effort removal of the temporary cache file produced by the renderer
   * once its bytes are safely in durable storage. A failure here never affects
   * the persisted document or masks the primary generation result, and the
   * durable target is never the file being discarded.
   */
  private discardTemporary(sourceUri: string, targetUri: string): void {
    if (!sourceUri || sourceUri === targetUri) {
      return;
    }
    try {
      const temporary = new File(sourceUri);
      if (temporary.exists) {
        temporary.delete();
      }
    } catch {
      // Cleanup is best-effort; the durable copy has already succeeded.
    }
  }

  remove(fileRef: string): void {
    const file = this.fileFor(fileRef);
    if (file.exists) {
      file.delete();
    }
  }

  locate(fileRef: string): string {
    return this.fileFor(fileRef).uri;
  }

  verify(fileRef: string): ReceiptDocumentVerification {
    const file = this.fileFor(fileRef);
    return { exists: file.exists, size: file.size };
  }

  pruneOrphans(referencedFileRefs: readonly string[]): void {
    const referenced = new Set(referencedFileRefs);
    for (const entry of this.directory().list()) {
      if (!(entry instanceof File)) {
        continue;
      }
      if (!referenced.has(`${RECEIPTS_DIRECTORY}/${entry.name}`)) {
        entry.delete();
      }
    }
  }
}