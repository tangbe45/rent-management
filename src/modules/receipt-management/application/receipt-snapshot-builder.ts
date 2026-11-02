import type { LandlordSettingsData, ReceiptAssetKind } from '../../settings/domain/landlord-settings';
import {
  RECEIPT_SNAPSHOT_VERSION,
  validateReceiptSnapshot,
  type ReceiptSnapshotData,
} from '../domain/receipt-snapshot';
import type { ReceiptDocumentAssets } from './receipt-document';
import { ReceiptContextIncompleteError } from './errors';
import type { ReceiptContext } from './receipt-context-lookup';

export interface BuildReceiptSnapshotInput {
  receiptNumber: string;
  language: 'en' | 'fr';
  generatedAt: number;
  landlordFullName: string;
  settings: LandlordSettingsData;
  context: ReceiptContext;
  assets: ReceiptDocumentAssets;
}

export interface BuiltReceiptSnapshot {
  snapshot: ReceiptSnapshotData;
  omittedAssets: ReceiptAssetKind[];
}

/**
 * Assembles the immutable receipt snapshot from a frozen moment in time. Every
 * printed value is captured here; later changes to settings, tenants,
 * properties or payments never alter it. Validation is shared with hydration,
 * so whatever is built here is exactly what is later read back.
 */
export function buildReceiptSnapshot(input: BuildReceiptSnapshotInput): BuiltReceiptSnapshot {
  const { settings, context, assets } = input;
  if (context.tenant === null || context.property === null || context.space === null) {
    throw new ReceiptContextIncompleteError(
      'The payment context is missing its tenant, property or space.',
    );
  }

  const omittedAssets: ReceiptAssetKind[] = [];
  const logoIncluded = assets.logo !== null;
  if (!logoIncluded && settings.logoFileName !== null) {
    omittedAssets.push('logo');
  }

  const signatureIncluded = settings.signatureMode === 'SAVED' && assets.signature !== null;
  if (!signatureIncluded && settings.signatureMode === 'SAVED') {
    omittedAssets.push('signature');
  }

  const stampIncluded = settings.stampMode === 'SAVED' && assets.stamp !== null;
  if (!stampIncluded && settings.stampMode === 'SAVED') {
    omittedAssets.push('stamp');
  }

  const snapshot = validateReceiptSnapshot({
    version: RECEIPT_SNAPSHOT_VERSION,
    language: input.language,
    receiptNumber: input.receiptNumber,
    generatedAt: input.generatedAt,
    landlord: {
      fullName: input.landlordFullName,
      phone: settings.landlordPhone,
      email: settings.landlordEmail,
      address: settings.landlordAddress,
    },
    property: {
      name: context.property.name,
      address: context.property.address,
    },
    space: {
      name: context.space.name,
      type: context.space.type,
    },
    tenant: {
      fullName: context.tenant.fullName,
      phone: context.tenant.phone,
    },
    payment: {
      paymentDate: context.payment.paymentDate,
      method: context.payment.method,
      reference: context.payment.reference,
      amount: context.payment.amount,
    },
    allocations: context.allocations.map((allocation) => ({
      installmentDueDate: allocation.installmentDueDate,
      amount: allocation.amount,
    })),
    appearance: {
      logoIncluded,
      signatureMode: settings.signatureMode,
      signatureIncluded,
      stampMode: settings.stampMode,
      stampIncluded,
      omittedAssets,
    },
  });

  return { snapshot, omittedAssets };
}