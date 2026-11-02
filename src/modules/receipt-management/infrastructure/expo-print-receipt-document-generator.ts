import { printToFileAsync } from 'expo-print';

import type {
  ReceiptDocumentGenerator,
  ReceiptDocumentRenderInput,
} from '../application/receipt-document';
import { buildReceiptHtml } from './receipt-html';

/**
 * Renders the snapshot HTML into a temporary PDF via the platform printer, with
 * the base64 included so the bytes are available even if the returned URI later
 * becomes invalid.
 */
export class ExpoPrintReceiptDocumentGenerator implements ReceiptDocumentGenerator {
  async generate(input: ReceiptDocumentRenderInput): Promise<{ uri: string; base64?: string }> {
    const result = await printToFileAsync({
      html: buildReceiptHtml(input.snapshot, input.assets),
      base64: true,
    });
    return { uri: result.uri, base64: result.base64 };
  }
}