import { LandlordSettings, type LandlordSettingsData } from '../../settings/domain/landlord-settings';
import { ReceiptContextIncompleteError } from './errors';
import { buildReceiptSnapshot } from './receipt-snapshot-builder';
import type { ReceiptContext } from './receipt-context-lookup';
import type { ReceiptDocumentAssets } from './receipt-document';

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
  allocations: [
    { installmentDueDate: '2026-01-01', amount: 10_000 },
    { installmentDueDate: '2026-02-01', amount: 20_000 },
  ],
  tenant: { fullName: 'Tenant', phone: '600000000' },
  property: { name: 'Immeuble A', address: 'Rue 12' },
  space: { name: 'Apt 3', type: 'APARTMENT' },
};

const noAssets: ReceiptDocumentAssets = { logo: null, signature: null, stamp: null };

function settings(): LandlordSettingsData {
  return LandlordSettings.defaults()
    .withContact(
      {
        landlordPhone: '+237 600 000 000',
        landlordEmail: 'landlord@example.com',
        landlordAddress: 'Yaoundé',
      },
      500,
    )
    .value;
}

describe('buildReceiptSnapshot', () => {
  it('freezes the payment, tenant, property and landlord details', () => {
    const { snapshot } = buildReceiptSnapshot({
      receiptNumber: 'RCP-000001',
      language: 'en',
      generatedAt: 1000,
      landlordFullName: 'Landlord Name',
      settings: settings(),
      context,
      assets: noAssets,
    });

    expect(snapshot.landlord).toMatchObject({
      fullName: 'Landlord Name',
      phone: '+237 600 000 000',
      email: 'landlord@example.com',
      address: 'Yaoundé',
    });
    expect(snapshot.payment.amount).toBe(30_000);
    expect(snapshot.allocations).toEqual([
      { installmentDueDate: '2026-01-01', amount: 10_000 },
      { installmentDueDate: '2026-02-01', amount: 20_000 },
    ]);
    expect(snapshot.appearance.signatureMode).toBe('MANUAL');
  });

  it('throws when the payment context is incomplete', () => {
    expect(() =>
      buildReceiptSnapshot({
        receiptNumber: 'RCP-000001',
        language: 'en',
        generatedAt: 1000,
        landlordFullName: 'Landlord Name',
        settings: settings(),
        context: { ...context, tenant: null },
        assets: noAssets,
      }),
    ).toThrow(ReceiptContextIncompleteError);
  });

  it('reports omitted assets when a configured image cannot be read', () => {
    const configured = LandlordSettings.defaults()
      .withAsset('logo', 'logo-1.png', 1)
      .withAsset('signature', 'signature-1.png', 1)
      .withAsset('stamp', 'stamp-1.png', 1)
      .value;

    const { snapshot, omittedAssets } = buildReceiptSnapshot({
      receiptNumber: 'RCP-000001',
      language: 'en',
      generatedAt: 1000,
      landlordFullName: 'Landlord Name',
      settings: configured,
      context,
      assets: noAssets,
    });

    expect(omittedAssets).toEqual(['logo', 'signature', 'stamp']);
    expect(snapshot.appearance.omittedAssets).toEqual(['logo', 'signature', 'stamp']);
    expect(snapshot.appearance.logoIncluded).toBe(false);
  });

  it('includes assets when their bytes are available', () => {
    const settingsWith = settings();
    const { snapshot, omittedAssets } = buildReceiptSnapshot({
      receiptNumber: 'RCP-000001',
      language: 'fr',
      generatedAt: 1000,
      landlordFullName: 'Landlord Name',
      settings: settingsWith,
      context,
      assets: {
        logo: { fileName: 'logo-1.png', base64: 'aGVsbG8=' },
        signature: { fileName: 'signature-1.png', base64: 'c2ln' },
        stamp: null,
      },
    });

    expect(omittedAssets).toEqual([]);
    expect(snapshot.appearance.logoIncluded).toBe(true);
    expect(snapshot.appearance.signatureMode).toBe('MANUAL');
    expect(snapshot.appearance.signatureIncluded).toBe(false);
    expect(snapshot.language).toBe('fr');
  });
});