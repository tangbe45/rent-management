import { SubscriptionExpiredError } from '../../subscription/application/errors';
import { LandlordSettings } from '../../settings/domain/landlord-settings';
import { Receipt } from '../domain/receipt';
import {
  ReceiptDocumentCreationError,
  ReceiptPaymentNotFoundError,
  ReversedPaymentError,
} from './errors';
import { GenerateReceipt, type ReceiptGenerationDeps } from './generate-receipt';
import { buildReceiptSnapshot } from './receipt-snapshot-builder';
import type { ReceiptContext } from './receipt-context-lookup';
import type { ReceiptDocumentAssets, ReceiptDocumentRenderInput, ReceiptDocumentStore } from './receipt-document';
import type { ReceiptRepositories, ReceiptUnitOfWork } from './receipt-unit-of-work';
import type { ReceiptRepository } from '../domain/receipt-repository';

const context: ReceiptContext = {
  payment: {
    id: 'payment-1',
    agreementId: 'agreement-1',
    amount: 30_000,
    paymentDate: '2026-02-05',
    method: 'CASH',
    reference: null,
    createdAt: 1000,
  },
  reversal: null,
  allocations: [{ installmentDueDate: '2026-01-01', amount: 30_000 }],
  tenant: { fullName: 'Tenant', phone: null },
  property: { name: 'Immeuble A', address: 'Rue 12' },
  space: { name: 'Apt 3', type: 'APARTMENT' },
};

function snapshotFor(receiptNumber = 'RCP-000001', language: 'en' | 'fr' = 'en') {
  return buildReceiptSnapshot({
    receiptNumber,
    language,
    generatedAt: 1000,
    landlordFullName: 'Landlord Name',
    settings: LandlordSettings.defaults().value,
    context,
    assets: noAssets(),
  }).snapshot;
}

function receiptFrom(snapshot: ReturnType<typeof snapshotFor>, id = 'receipt-existing') {
  return Receipt.hydrate({
    id,
    receiptNumber: snapshot.receiptNumber,
    paymentId: 'payment-1',
    agreementId: 'agreement-1',
    language: snapshot.language,
    snapshot,
    documentFileRef: `receipts/${id}.pdf`,
    documentSize: 987,
    createdAt: 1000,
  });
}

function noAssets(): ReceiptDocumentAssets {
  return { logo: null, signature: null, stamp: null };
}

interface Harness {
  save: jest.Mock;
  paymentLookup: jest.Mock;
  sequence: jest.Mock;
  generator: { generate: jest.Mock };
  entitlement: jest.Mock;
  documents: jest.Mocked<ReceiptDocumentStore>;
  makeUseCase: (overrides?: Partial<ReceiptGenerationDeps>) => GenerateReceipt;
}

function createHarness(): Harness {
  const save = jest.fn();
  const paymentLookup = jest.fn(() => null);
  const sequence = jest.fn(() => 1);
  const generator = {
    generate: jest.fn(async (_input: ReceiptDocumentRenderInput) => ({
      uri: 'file:///cache/payment-1.pdf',
      base64: 'cGRm',
    })),
  };
  const entitlement = jest.fn();
  const documents = {
    persist: jest.fn(async (receiptId: string, _source: { uri: string; base64?: string }) => ({
      fileRef: `receipts/${receiptId}.pdf`,
      size: 1234,
    })),
    remove: jest.fn(),
    locate: jest.fn((fileRef: string) => `file:///documents/${fileRef}`),
    verify: jest.fn(() => ({ exists: true, size: 1234 })),
    pruneOrphans: jest.fn(),
  } as unknown as jest.Mocked<ReceiptDocumentStore>;

  const repositories: ReceiptRepositories = {
    receipts: {
      save,
      findById: jest.fn(() => null),
      findByPaymentId: paymentLookup,
      findAll: jest.fn(() => []),
      count: jest.fn(() => 0),
    } as unknown as ReceiptRepository,
    sequence: { allocateNext: sequence },
  };

  const unitOfWork: ReceiptUnitOfWork = {
    run: (work) => work(repositories),
  };

  const defaults: ReceiptGenerationDeps = {
    unitOfWork,
    context: {
      findByPaymentId: () => context,
      isReversed: () => false,
      findReversedPaymentIds: () => new Set(),
    },
    settings: { get: () => LandlordSettings.defaults() },
    identity: { findFullName: () => 'Landlord Name' },
    assets: { readBase64: async () => null },
    documents,
    generator,
    entitlement: { assertCanGenerateReceipt: entitlement },
    idGenerator: { next: () => 'receipt-1' },
    clock: { today: () => '2026-10-10', now: () => 5000 },
  };

  return {
    save,
    paymentLookup,
    sequence,
    generator,
    entitlement,
    documents,
    makeUseCase: (overrides = {}) => new GenerateReceipt({ ...defaults, ...overrides }),
  };
}

describe('GenerateReceipt', () => {
  it('checks the entitlement before reading anything', async () => {
    const { makeUseCase, entitlement, paymentLookup } = createHarness();
    entitlement.mockImplementation(() => {
      throw new SubscriptionExpiredError();
    });

    await expect(makeUseCase().execute({ paymentId: 'payment-1', language: 'en' })).rejects.toThrow(
      SubscriptionExpiredError,
    );
    expect(paymentLookup).not.toHaveBeenCalled();
  });

  it('rejects an unknown payment', async () => {
    const { makeUseCase } = createHarness();
    const useCase = makeUseCase({
      context: {
        findByPaymentId: () => null,
        isReversed: () => false,
        findReversedPaymentIds: () => new Set(),
      },
    });

    await expect(useCase.execute({ paymentId: 'missing', language: 'en' })).rejects.toThrow(
      ReceiptPaymentNotFoundError,
    );
  });

  it('rejects a reversed payment without persisting anything', async () => {
    const { makeUseCase, generator, documents } = createHarness();
    const reversedContext: ReceiptContext = {
      ...context,
      reversal: { paymentId: 'payment-1', reason: 'WRONG_AMOUNT', explanation: null, reversedAt: 2000 },
    };
    const useCase = makeUseCase({
      context: {
        findByPaymentId: () => reversedContext,
        isReversed: () => true,
        findReversedPaymentIds: () => new Set(['payment-1']),
      },
    });

    await expect(useCase.execute({ paymentId: 'payment-1', language: 'en' })).rejects.toThrow(
      ReversedPaymentError,
    );
    expect(generator.generate).not.toHaveBeenCalled();
    expect(documents.persist).not.toHaveBeenCalled();
  });

  it('finalizes a receipt: number allocated once, document persisted, row saved', async () => {
    const { makeUseCase, sequence, documents, save } = createHarness();

    const result = await makeUseCase().execute({ paymentId: 'payment-1', language: 'en' });

    expect(result.created).toBe(true);
    expect(result.receipt.receiptNumber).toBe('RCP-000001');
    expect(result.receipt.id).toBe('receipt-1');
    expect(result.omittedAssets).toEqual([]);
    expect(sequence).toHaveBeenCalledTimes(1);
    expect(documents.persist).toHaveBeenCalledWith('receipt-1', {
      uri: 'file:///cache/payment-1.pdf',
      base64: 'cGRm',
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('returns the stored receipt and skips generation when one already exists', async () => {
    const existing = receiptFrom(snapshotFor('RCP-000042'));
    const { makeUseCase, paymentLookup, generator, documents } = createHarness();
    paymentLookup.mockReturnValue(existing);

    const result = await makeUseCase().execute({ paymentId: 'payment-1', language: 'en' });

    expect(result.created).toBe(false);
    expect(result.receipt.receiptNumber).toBe('RCP-000042');
    expect(generator.generate).not.toHaveBeenCalled();
    expect(documents.persist).not.toHaveBeenCalled();
  });

  it('keeps the stored receipt and removes the orphan PDF on a unique conflict', async () => {
    const concurrent = receiptFrom(snapshotFor('RCP-000002'), 'receipt-concurrent');
    const { makeUseCase, paymentLookup, save, documents } = createHarness();
    paymentLookup.mockReturnValueOnce(null).mockReturnValue(concurrent);
    save.mockImplementation(() => {
      throw new Error('UNIQUE constraint failed');
    });

    const result = await makeUseCase().execute({ paymentId: 'payment-1', language: 'en' });

    expect(result.created).toBe(false);
    expect(result.receipt.id).toBe('receipt-concurrent');
    expect(documents.remove).toHaveBeenCalledWith('receipts/receipt-1.pdf');
  });

  it('reports omitted assets when a configured image is unreadable', async () => {
    const withLogo = LandlordSettings.defaults().withAsset('logo', 'logo-1.png', 1);
    const { makeUseCase } = createHarness();
    const useCase = makeUseCase({ settings: { get: () => withLogo } });

    const result = await useCase.execute({ paymentId: 'payment-1', language: 'en' });
    expect(result.omittedAssets).toEqual(['logo']);
  });

  it('reports an omitted signature asset when the image is unreadable', async () => {
    const withSignature = LandlordSettings.defaults().withAsset('signature', 'signature-1.png', 1);
    const { makeUseCase } = createHarness();
    const useCase = makeUseCase({ settings: { get: () => withSignature } });

    const result = await useCase.execute({ paymentId: 'payment-1', language: 'en' });
    expect(result.omittedAssets).toEqual(['signature']);
  });

  it('reports an omitted stamp asset when the image is unreadable', async () => {
    const withStamp = LandlordSettings.defaults().withAsset('stamp', 'stamp-1.png', 1);
    const { makeUseCase } = createHarness();
    const useCase = makeUseCase({ settings: { get: () => withStamp } });

    const result = await useCase.execute({ paymentId: 'payment-1', language: 'en' });
    expect(result.omittedAssets).toEqual(['stamp']);
  });

  it('runs a best-effort orphan cleanup before finalizing', async () => {
    const { makeUseCase, documents } = createHarness();

    await makeUseCase().execute({ paymentId: 'payment-1', language: 'en' });
    expect(documents.pruneOrphans).toHaveBeenCalled();
  });

  it('surfaces a document-creation error when rendering fails, without saving a row', async () => {
    const { makeUseCase, generator, documents, save } = createHarness();
    generator.generate.mockRejectedValue(new Error('print failed'));

    await expect(makeUseCase().execute({ paymentId: 'payment-1', language: 'en' })).rejects.toThrow(
      ReceiptDocumentCreationError,
    );
    expect(documents.persist).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('surfaces a document-creation error when persistence fails, without saving a row', async () => {
    const { makeUseCase, documents, save } = createHarness();
    documents.persist.mockRejectedValue(new Error('disk full'));

    await expect(makeUseCase().execute({ paymentId: 'payment-1', language: 'en' })).rejects.toThrow(
      ReceiptDocumentCreationError,
    );
    expect(save).not.toHaveBeenCalled();
  });
});