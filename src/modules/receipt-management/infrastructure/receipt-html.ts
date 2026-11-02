import { hasTranslationKey, translate, type Locale, type TranslationKey } from '../../../shared/i18n';
import { formatFcfaAmount } from '../../../shared/presentation/money';
import type { ReceiptDocumentAssets, ReceiptDocumentImage } from '../application/receipt-document';
import type { ReceiptSnapshotData } from '../domain/receipt-snapshot';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

/**
 * Resolves a stored value to a translation key when one exists (payment methods
 * and space types are enumerated), otherwise returns the raw value so unknown
 * data still prints rather than disappearing.
 */
function labelFor(locale: Locale, prefix: string, value: string): string {
  const key = `${prefix}${value}`;
  return hasTranslationKey(key) ? translate(locale, key) : value;
}

function formatDate(value: string, locale: Locale): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'UTC' });
}

function formatTimestamp(timestamp: number, locale: Locale): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const day = date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB');
  const time = date.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} ${time}`;
}

function imageDataUri(image: ReceiptDocumentImage): string {
  const extension = image.fileName.toLowerCase().split('.').pop();
  const mime =
    extension === 'jpg' || extension === 'jpeg'
      ? 'image/jpeg'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/png';
  return `data:${mime};base64,${image.base64}`;
}

function contactLine(label: string, value: string | null): string {
  return value === null
    ? ''
    : `<div class="contact"><span class="contact-label">${escapeHtml(label)}</span>${escapeHtml(value)}</div>`;
}

function optionalRow(label: string, value: string | null): string {
  return value === null
    ? ''
    : `<div class="row"><span class="row-label">${escapeHtml(label)}</span><span class="row-value">${escapeHtml(value)}</span></div>`;
}

/**
 * Renders the immutable snapshot into a self-contained HTML document. This is a
 * pure function (no Expo/filesystem access) so it can be tested directly; the
 * generator only feeds it to `Print.printToFileAsync`. All user-supplied values
 * are escaped, and the language is taken from the snapshot so the produced PDF
 * keeps the language it was created in.
 */
export function buildReceiptHtml(
  snapshot: ReceiptSnapshotData,
  assets: ReceiptDocumentAssets,
): string {
  const locale = snapshot.language;
  const t = (key: TranslationKey): string => translate(locale, key);
  const { landlord, property, space, tenant, payment, appearance } = snapshot;

  const logoHtml =
    appearance.logoIncluded && assets.logo !== null
      ? `<img class="logo" src="${imageDataUri(assets.logo)}" alt="" />`
      : '';

  const allocationRows = snapshot.allocations
    .map(
      (allocation) =>
        `<tr><td>${escapeHtml(formatDate(allocation.installmentDueDate, locale))}</td>` +
        `<td class="amount">${escapeHtml(formatFcfaAmount(allocation.amount, locale))}</td></tr>`,
    )
    .join('');

  const signatureHtml =
    appearance.signatureIncluded && assets.signature !== null
      ? `<img class="mark" src="${imageDataUri(assets.signature)}" alt="" />`
      : '<div class="mark-space"></div>';

  const stampHtml =
    appearance.stampIncluded && assets.stamp !== null
      ? `<img class="mark" src="${imageDataUri(assets.stamp)}" alt="" />`
      : '<div class="mark-space"></div>';

  const referenceRow = optionalRow(t('receipt.details.reference'), payment.reference);

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    color: #1c1c1e;
    margin: 0;
    padding: 32px 36px;
    font-size: 13px;
    line-height: 1.45;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { max-height: 72px; max-width: 180px; object-fit: contain; }
  .title { text-align: right; }
  .title h1 { font-size: 26px; letter-spacing: 2px; margin: 0; text-transform: uppercase; }
  .title .number { font-size: 14px; color: #3a3a3c; margin-top: 4px; font-weight: 600; }
  .rule { height: 2px; background: #1c1c1e; margin: 18px 0 20px; }
  .cards { display: flex; gap: 20px; }
  .card { flex: 1; border: 1px solid #d1d1d6; border-radius: 8px; padding: 12px 14px; }
  .card h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6c6c70; margin: 0 0 8px; }
  .card .name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
  .contact { color: #3a3a3c; }
  .contact-label { color: #8e8e93; margin-right: 6px; }
  .row { display: flex; justify-content: space-between; gap: 10px; padding: 3px 0; }
  .row-label { color: #8e8e93; }
  .row-value { text-align: right; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-top: 22px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e5ea; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6c6c70; }
  td.amount, th.amount { text-align: right; }
  tfoot td { border-bottom: none; font-weight: 700; font-size: 15px; padding-top: 12px; }
  .marks { display: flex; gap: 40px; margin-top: 46px; }
  .mark-block { flex: 1; }
  .mark-block .mark-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6c6c70; margin-bottom: 6px; }
  .mark { max-height: 80px; max-width: 200px; object-fit: contain; }
  .mark-space { height: 72px; border-bottom: 1px solid #1c1c1e; }
  .footer { margin-top: 40px; font-size: 11px; color: #8e8e93; }
</style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="title">
      <h1>${escapeHtml(t('receipt.pdf.title'))}</h1>
      <div class="number">${escapeHtml(t('receipt.details.number'))}: ${escapeHtml(snapshot.receiptNumber)}</div>
    </div>
  </div>
  <div class="rule"></div>
  <div class="cards">
    <div class="card">
      <h2>${escapeHtml(t('receipt.pdf.from'))}</h2>
      <div class="name">${escapeHtml(landlord.fullName)}</div>
      ${contactLine(t('settings.landlord.phone'), landlord.phone)}
      ${contactLine(t('settings.landlord.email'), landlord.email)}
      ${contactLine(t('settings.landlord.address'), landlord.address)}
    </div>
    <div class="card">
      <h2>${escapeHtml(t('receipt.pdf.tenant'))}</h2>
      <div class="name">${escapeHtml(tenant.fullName)}</div>
      ${contactLine(t('settings.landlord.phone'), tenant.phone)}
    </div>
  </div>
  <div class="cards" style="margin-top: 16px;">
    <div class="card">
      <h2>${escapeHtml(t('receipt.pdf.property'))}</h2>
      <div class="name">${escapeHtml(property.name)}</div>
      <div class="contact">${escapeHtml(property.address)}</div>
      <div class="contact"><span class="contact-label">${escapeHtml(t('receipt.pdf.space'))}</span>${escapeHtml(space.name)} (${escapeHtml(labelFor(locale, 'spaces.type.', space.type))})</div>
    </div>
    <div class="card">
      <h2>${escapeHtml(t('receipt.pdf.payment'))}</h2>
      ${optionalRow(t('receipt.details.paymentDate'), formatDate(payment.paymentDate, locale))}
      ${optionalRow(t('receipt.details.method'), labelFor(locale, 'rent.method.', payment.method))}
      ${referenceRow}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(t('receipt.pdf.period'))}</th>
        <th class="amount">${escapeHtml(t('receipt.pdf.amount'))}</th>
      </tr>
    </thead>
    <tbody>
      ${allocationRows}
    </tbody>
    <tfoot>
      <tr>
        <td>${escapeHtml(t('receipt.pdf.total'))}</td>
        <td class="amount">${escapeHtml(formatFcfaAmount(payment.amount, locale))}</td>
      </tr>
    </tfoot>
  </table>
  <div class="marks">
    <div class="mark-block">
      <div class="mark-label">${escapeHtml(t('receipt.pdf.signature'))}</div>
      ${signatureHtml}
    </div>
    <div class="mark-block">
      <div class="mark-label">${escapeHtml(t('receipt.pdf.stamp'))}</div>
      ${stampHtml}
    </div>
  </div>
  <div class="footer">${escapeHtml(t('receipt.pdf.generatedOn'))}: ${escapeHtml(formatTimestamp(snapshot.generatedAt, locale))}</div>
</body>
</html>`;
}