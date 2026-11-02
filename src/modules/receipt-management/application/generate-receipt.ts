import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import type { LandlordSettings, ReceiptAssetKind } from '../../settings/domain/landlord-settings';
import { Receipt } from '../domain/receipt';
import type { ReceiptSnapshotData } from '../domain/receipt-snapshot';
import { formatReceiptNumber } from '../domain/receipt-number';
import { buildReceiptSnapshot } from './receipt-snapshot-builder';
import { ReceiptContextIncompleteError, ReceiptDocumentCreationError, ReceiptPaymentNotFoundError, ReversedPaymentError } from './errors';
import type { LandlordIdentityLookup, ReceiptAssetReader } from './receipt-asset-reader';
import type { ReceiptContextLookup } from './receipt-context-lookup';
import type {
  ReceiptDocumentAssets,
  ReceiptDocumentGenerator,
  ReceiptDocumentStore,
} from './receipt-document';
import type { ReceiptUnitOfWork } from './receipt-unit-of-work';

export interface ReceiptEntitlement {
  assertCanGenerateReceipt(): void;
}

export interface ReceiptGenerationDeps {
  unitOfWork: ReceiptUnitOfWork;
  context: ReceiptContextLookup;
  settings: { get(): LandlordSettings };
  identity: LandlordIdentityLookup;
  assets: ReceiptAssetReader;
  documents: ReceiptDocumentStore;
  generator: ReceiptDocumentGenerator;
  entitlement: ReceiptEntitlement;
  idGenerator: IdGenerator;
  clock: Clock;
}

export interface GenerateReceiptResult {
  receipt: Receipt;
  created: boolean;
  omittedAssets: readonly ReceiptAssetKind[];
}

/**
 * Finalizes one receipt for an eligible, non-reversed rent payment.
 *
 * Ordering is deliberate: entitlement, payment eligibility and the existing
 * receipt are checked first; the permanent number is then allocated only inside
 * a transaction, the PDF is rendered and moved into durable storage, and the
 * receipt row is inserted last. A unique-payment conflict (a concurrent or
 * retried generation) is resolved by removing the just-written document and
 * returning the stored receipt instead of creating a duplicate. A crash between
 * the durable PDF write and the row insert leaves a harmless orphan file and a
 * skipped number, never a finalized receipt without its document.
 */
export class GenerateReceipt {
  constructor(private readonly deps: ReceiptGenerationDeps) {}

  async execute(input: { paymentId: string; language: 'en' | 'fr' }): Promise<GenerateReceiptResult> {
    this.deps.entitlement.assertCanGenerateReceipt();

    const context = this.deps.context.findByPaymentId(input.paymentId);
    if (context === null) {
      throw new ReceiptPaymentNotFoundError(input.paymentId);
    }
    if (context.reversal !== null) {
      throw new ReversedPaymentError(input.paymentId);
    }

    const existing = this.deps.unitOfWork.run(({ receipts }) =>
      receipts.findByPaymentId(input.paymentId),
    );
    if (existing !== null) {
      return { receipt: existing, created: false, omittedAssets: [] };
    }

    try {
      this.deps.unitOfWork.run(({ receipts }) => {
        this.deps.documents.pruneOrphans(receipts.findAll().map((receipt) => receipt.documentFileRef));
      });
    } catch {
      // Best-effort recovery only; it must never block receipt generation.
    }

    const settings = this.deps.settings.get();
    const landlordFullName = this.deps.identity.findFullName();
    if (landlordFullName === null) {
      throw new ReceiptContextIncompleteError('The account has no landlord name.');
    }

    const assets = await this.readAssets(settings.value);
    const receiptNumber = formatReceiptNumber(
      this.deps.unitOfWork.run(({ sequence }) => sequence.allocateNext()),
    );

    const receiptId = this.deps.idGenerator.next();
    const generatedAt = this.deps.clock.now();

    const { snapshot, omittedAssets } = buildReceiptSnapshot({
      receiptNumber,
      language: input.language,
      generatedAt,
      landlordFullName,
      settings: settings.value,
      context,
      assets,
    });

    const persisted = await this.createDocument(receiptId, snapshot, assets);

    const receipt = Receipt.create({
      id: receiptId,
      receiptNumber,
      paymentId: context.payment.id,
      agreementId: context.payment.agreementId,
      language: input.language,
      snapshot,
      documentFileRef: persisted.fileRef,
      documentSize: persisted.size,
      createdAt: generatedAt,
    });

    try {
      this.deps.unitOfWork.run(({ receipts }) => receipts.save(receipt));
    } catch (error) {
      this.deps.documents.remove(receipt.documentFileRef);
      const concurrent = this.deps.unitOfWork.run(({ receipts }) =>
        receipts.findByPaymentId(input.paymentId),
      );
      if (concurrent !== null) {
        return { receipt: concurrent, created: false, omittedAssets: [] };
      }
      throw error;
    }

    return { receipt, created: true, omittedAssets };
  }

  /**
   * Renders the receipt PDF and writes it to durable storage. Any failure in
   * this pair is surfaced as a document-creation error so the UI can show a
   * specific, actionable message instead of a generic one.
   */
  private async createDocument(
    receiptId: string,
    snapshot: ReceiptSnapshotData,
    assets: ReceiptDocumentAssets,
  ): Promise<{ fileRef: string; size: number }> {
    try {
      const rendered = await this.deps.generator.generate({ snapshot, assets });
      return await this.deps.documents.persist(receiptId, rendered);
    } catch {
      throw new ReceiptDocumentCreationError();
    }
  }

  private async readAssets(settings: {
    logoFileName: string | null;
    signatureFileName: string | null;
    stampFileName: string | null;
  }): Promise<ReceiptDocumentAssets> {
    const read = async (fileName: string | null): Promise<ReceiptDocumentAssets['logo']> => {
      if (fileName === null) {
        return null;
      }
      const base64 = await this.deps.assets.readBase64(fileName);
      return base64 === null ? null : { fileName, base64 };
    };
    const [logo, signature, stamp] = await Promise.all([
      read(settings.logoFileName),
      read(settings.signatureFileName),
      read(settings.stampFileName),
    ]);
    return { logo, signature, stamp };
  }
}