import * as ExpoFileSystem from 'expo-file-system';

import { ExpoReceiptDocumentStore } from './expo-receipt-document-store';

jest.mock('expo-file-system', () => {
  const files = new Map<string, { size: number }>();
  const throwOnDelete = new Set<string>();

  const uriOf = (parent: string, name: string) => `${parent}/${name}`;

  class Directory {
    readonly uri: string;

    constructor(value: string | { uri: string }, name?: string) {
      const base = typeof value === 'string' ? value : value.uri;
      this.uri = name ? uriOf(base, name) : base;
    }

    get exists() {
      return true;
    }

    create(_options?: unknown) {}

    list() {
      return [];
    }
  }

  class File {
    readonly uri: string;

    constructor(value: string | Directory, name?: string) {
      const base = typeof value === 'string' ? value : value.uri;
      this.uri = name ? uriOf(base, name) : base;
    }

    get exists() {
      return files.has(this.uri);
    }

    get size() {
      return files.get(this.uri)?.size ?? 0;
    }

    create(_options?: unknown) {
      files.set(this.uri, { size: 0 });
    }

    write(content: string, _options?: unknown) {
      files.set(this.uri, { size: content.length });
    }

    async move(target: File) {
      files.set(target.uri, files.get(this.uri) ?? { size: 0 });
      files.delete(this.uri);
    }

    delete() {
      if (throwOnDelete.has(this.uri)) {
        throw new Error('cannot delete');
      }
      files.delete(this.uri);
    }
  }

  return {
    EncodingType: { Base64: 'base64' },
    Paths: { document: 'file:///document' },
    Directory,
    File,
    __files: files,
    __throwOnDelete: throwOnDelete,
    __reset: () => {
      files.clear();
      throwOnDelete.clear();
    },
  };
});

const files = (ExpoFileSystem as unknown as { __files: Map<string, { size: number }> }).__files;
const throwOnDelete = (ExpoFileSystem as unknown as { __throwOnDelete: Set<string> }).__throwOnDelete;
const resetFs = (ExpoFileSystem as unknown as { __reset: () => void }).__reset;

const TEMP = 'file:///cache/payment-1.pdf';
const TARGET = 'file:///document/receipts/receipt-1.pdf';

describe('ExpoReceiptDocumentStore.persist', () => {
  beforeEach(() => {
    resetFs();
  });

  it('removes the temporary cache file once the durable copy is written', async () => {
    files.set(TEMP, { size: 5 });
    const store = new ExpoReceiptDocumentStore();

    const result = await store.persist('receipt-1', { uri: TEMP, base64: 'cGRm' });

    expect(result.fileRef).toBe('receipts/receipt-1.pdf');
    expect(files.has(TEMP)).toBe(false);
    expect(files.get(TARGET)?.size).toBe(4);
  });

  it('never removes the finalized document even if it is reported as the source', async () => {
    files.set(TARGET, { size: 7 });
    const store = new ExpoReceiptDocumentStore();

    await store.persist('receipt-1', { uri: TARGET, base64: 'cGRm' });

    expect(files.has(TARGET)).toBe(true);
  });

  it('cleans up the cache file when the source is moved into place', async () => {
    files.set(TEMP, { size: 9 });
    const store = new ExpoReceiptDocumentStore();

    await store.persist('receipt-1', { uri: TEMP });

    expect(files.has(TEMP)).toBe(false);
    expect(files.get(TARGET)?.size).toBe(9);
  });

  it('still finalizes the document when cache cleanup fails', async () => {
    files.set(TEMP, { size: 5 });
    throwOnDelete.add(TEMP);
    const store = new ExpoReceiptDocumentStore();

    const result = await store.persist('receipt-1', { uri: TEMP, base64: 'cGRm' });

    expect(result.fileRef).toBe('receipts/receipt-1.pdf');
    expect(files.has(TARGET)).toBe(true);
  });
});
