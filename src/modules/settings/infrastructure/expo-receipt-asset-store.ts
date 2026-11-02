import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { ReceiptAssetStore } from '../application/receipt-asset-store';
import type { ReceiptAssetKind } from '../domain/landlord-settings';

const ASSETS_DIRECTORY = 'receipt-assets';

function extensionOf(sourceUri: string): string {
  const extension = Paths.extname(sourceUri)?.toLowerCase() ?? '';
  return extension.length > 0 && extension.length <= 8 ? extension : '.png';
}

/**
 * Stores the landlord's optional logo/signature/stamp images in the durable
 * document directory. Picked cache images are copied in, never referenced in
 * place, so permanently selected assets survive restarts and cache purges.
 */
export class ExpoReceiptAssetStore implements ReceiptAssetStore {
  private directory(): Directory {
    const dir = new Directory(Paths.document, ASSETS_DIRECTORY);
    if (!dir.exists) {
      dir.create();
    }
    return dir;
  }

  async import(sourceUri: string, kind: ReceiptAssetKind): Promise<string> {
    const source = new File(sourceUri);
    const fileName = `${kind}-${randomUUID()}${extensionOf(sourceUri)}`;
    await source.copy(new File(this.directory(), fileName));
    return fileName;
  }

  remove(fileName: string): void {
    const file = new File(this.directory(), fileName);
    if (file.exists) {
      file.delete();
    }
  }

  exists(fileName: string): boolean {
    const file = new File(this.directory(), fileName);
    return file.exists && file.size > 0;
  }

  async readBase64(fileName: string): Promise<string | null> {
    const file = new File(this.directory(), fileName);
    if (!file.exists || file.size === 0) {
      return null;
    }
    return file.base64();
  }
}