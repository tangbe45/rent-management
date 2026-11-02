import { printAsync } from 'expo-print';

import type { ReceiptPrinter } from '../application/receipt-document';

export class ExpoReceiptPrinter implements ReceiptPrinter {
  async print(uri: string): Promise<void> {
    await printAsync({ uri });
  }
}