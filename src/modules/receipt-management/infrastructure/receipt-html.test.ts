import { LandlordSettings } from '../../settings/domain/landlord-settings';
import type { ReceiptDocumentAssets } from '../application/receipt-document';
import type { ReceiptContext } from '../application/receipt-context-lookup';
import { buildReceiptSnapshot } from '../application/receipt-snapshot-builder';
import { buildReceiptHtml } from './receipt-html';

const context: ReceiptContext = {
  payment: {
    id: 'payment-1',
    agreementId: 'agreement-1',
    amount: 30_000,
    paymentDate: '2026-02-05',
    method: 'MOBILE_MONEY',
    reference: 'MM-42',
    createdAt: 1000,
  },
  reversal: null,
  allocations: [
    { installmentDueDate: '2026-01-01', amount: 10_000 },
    { installmentDueDate: '2026-02-01', amount: 20_000 },
  ],
  tenant: { fullName: '<Tenant & Co>', phone: '600000000' },
  property: { name: 'Immeuble A', address: 'Rue 12' },
  space: { name: 'Apt 3', type: 'APARTMENT' },
};

function build(overrides: {
  language?: 'en' | 'fr';
  assets?: ReceiptDocumentAssets;
  settings?: LandlordSettings;
} = {}) {
  const settings = overrides.settings ?? LandlordSettings.defaults();
  const { snapshot } = buildReceiptSnapshot({
    receiptNumber: 'RCP-000001',
    language: overrides.language ?? 'en',
    generatedAt: 1000,
    landlordFullName: 'Landlord Name',
    settings: settings.value,
    context,
    assets: overrides.assets ?? { logo: null, signature: null, stamp: null },
  });
  return buildReceiptHtml(snapshot, overrides.assets ?? { logo: null, signature: null, stamp: null });
}

describe('buildReceiptHtml', () => {
  it('renders the receipt number, tenant, allocations and total', () => {
    const html = build();
    expect(html).toContain('RCP-000001');
    expect(html).toContain('Immeuble A');
    expect(html).toContain('Apt 3');
    expect(html).toContain('Apartment');
    expect(html).toContain('Mobile money');
    expect(html).toContain('MM-42');
    expect(html).toContain('300 FCFA');
    expect(html).toContain('100 FCFA');
    expect(html).toContain('200 FCFA');
    expect(html).toContain('01/01/2026');
    expect(html).toContain('01/02/2026');
  });

  it('escapes user-supplied values', () => {
    const html = build();
    expect(html).toContain('&lt;Tenant &amp; Co&gt;');
    expect(html).not.toContain('<Tenant & Co>');
  });

  it('uses the snapshot language for labels', () => {
    const en = build({ language: 'en' });
    const fr = build({ language: 'fr' });
    expect(en).toContain('>Receipt<');
    expect(en).toContain('Total amount received');
    expect(fr).toContain('Reçu');
    expect(fr).toContain('Montant total reçu');
  });

  it('embeds a saved signature image only when included in the snapshot', () => {
    const assets: ReceiptDocumentAssets = {
      logo: null,
      signature: { fileName: 'signature-1.png', base64: 'c2lnbmF0dXJl' },
      stamp: null,
    };
    const settings = LandlordSettings.defaults().withAsset('signature', 'signature-1.png', 1);
    const html = build({ assets, settings });
    expect(html).toContain('data:image/png;base64,c2lnbmF0dXJl');
  });

  it('leaves a manual signing space when no image was used', () => {
    const html = build();
    expect(html).toContain('mark-space');
    expect(html).not.toContain('data:image/');
  });

  it('defensively keeps both mark spaces when SAVED assets are flagged but missing', () => {
    const settings = LandlordSettings.defaults()
      .withAsset('signature', 'signature-1.png', 1)
      .withAsset('stamp', 'stamp-1.png', 1);
    const { snapshot } = buildReceiptSnapshot({
      receiptNumber: 'RCP-000001',
      language: 'en',
      generatedAt: 1000,
      landlordFullName: 'Landlord Name',
      settings: settings.value,
      context,
      assets: { logo: null, signature: null, stamp: null },
    });
    snapshot.appearance.signatureIncluded = true;
    snapshot.appearance.stampIncluded = true;

    const html = buildReceiptHtml(snapshot, { logo: null, signature: null, stamp: null });

    expect((html.match(/class="mark-space"/g) ?? []).length).toBe(2);
    expect(html).not.toContain('data:image/');
  });

  it('handles jpeg assets through the correct mime type', () => {
    const assets: ReceiptDocumentAssets = {
      logo: { fileName: 'logo-1.jpg', base64: 'amZp' },
      signature: null,
      stamp: null,
    };
    const settings = LandlordSettings.defaults().withAsset('logo', 'logo-1.jpg', 1);
    const html = build({ assets, settings });
    expect(html).toContain('data:image/jpeg;base64,amZp');
  });
});