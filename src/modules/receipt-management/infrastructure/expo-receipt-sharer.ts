import * as Sharing from 'expo-sharing';

import type { ReceiptSharer } from '../application/receipt-document';

export class ExpoReceiptSharer implements ReceiptSharer {
  isAvailable(): Promise<boolean> {
    return Sharing.isAvailableAsync();
  }

  async share(uri: string): Promise<void> {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}