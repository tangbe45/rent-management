import { router } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import type { RentPaymentDetails } from '../../rent-payment-management/application/get-rent-payment';
import { getRentPayment } from '../../rent-payment-management/infrastructure/composition-root';
import { SubscriptionExpiredError } from '../../subscription/application/errors';
import type { GenerateReceiptResult } from '../application/generate-receipt';
import type { ReceiptView } from '../application/get-receipt';
import { Receipt } from '../domain/receipt';
import type { ReceiptSnapshotData } from '../domain/receipt-snapshot';
import { generateReceipt, getReceiptForPayment } from '../infrastructure/composition-root';
import { GenerateReceiptScreen } from './generate-receipt-screen';
import { receiptAmount } from './receipt-ui';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  generateReceipt: { execute: jest.fn() },
  getReceiptForPayment: { execute: jest.fn() },
}));

jest.mock('../../rent-payment-management/infrastructure/composition-root', () => ({
  getRentPayment: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

const BASE_SNAPSHOT: ReceiptSnapshotData = {
  version: 1,
  language: 'en',
  receiptNumber: 'RCP-000001',
  generatedAt: 1_700_000_000_000,
  landlord: { fullName: 'Landlord Name', phone: null, email: null, address: null },
  property: { name: 'Immeuble A', address: 'Rue 12' },
  space: { name: 'Apt 3', type: 'APARTMENT' },
  tenant: { fullName: 'Amina Njeri', phone: null },
  payment: { paymentDate: '2026-01-05', method: 'CASH', reference: null, amount: 25_000 },
  allocations: [{ installmentDueDate: '2026-01-01', amount: 25_000 }],
  appearance: {
    logoIncluded: false,
    signatureMode: 'MANUAL',
    signatureIncluded: false,
    stampMode: 'MANUAL',
    stampIncluded: false,
    omittedAssets: [],
  },
};

function makeReceipt(): Receipt {
  return Receipt.hydrate({
    id: 'receipt-1',
    receiptNumber: 'RCP-000001',
    paymentId: 'payment-1',
    agreementId: 'agreement-1',
    language: 'en',
    snapshot: BASE_SNAPSHOT,
    documentFileRef: 'receipts/receipt-1.pdf',
    documentSize: 987,
    createdAt: 1000,
  });
}

const DETAILS: RentPaymentDetails = {
  payment: {
    id: 'payment-1',
    agreementId: 'agreement-1',
    amount: 25_000,
    paymentDate: '2026-01-05',
    method: 'CASH',
    reference: null,
    notes: null,
    createdAt: 1,
  },
  reversal: null,
  allocations: [
    { installmentId: 'installment-1', installmentDueDate: '2026-01-01', amount: 25_000 },
  ],
};

const REVERSED_DETAILS: RentPaymentDetails = {
  ...DETAILS,
  reversal: {
    paymentId: 'payment-1',
    reason: 'DUPLICATE',
    explanation: null,
    reversedAt: 1_700_000_000_000,
  },
};

const EXISTING_VIEW: ReceiptView = { receipt: makeReceipt(), reversed: false };

const RESULT: GenerateReceiptResult = { receipt: makeReceipt(), created: true, omittedAssets: [] };
const RESULT_WITH_OMISSIONS: GenerateReceiptResult = {
  receipt: makeReceipt(),
  created: true,
  omittedAssets: ['logo'],
};

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === fragment);
}

function countText(root: ReactTestInstance, fragment: string): number {
  return root.findAllByType(Text).filter((instance) => instance.props.children === fragment).length;
}

function findButton(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  })[0];
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<GenerateReceiptScreen paymentId="payment-1" />);
  });
  return renderer;
}

describe('GenerateReceiptScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocale('en');
    jest.mocked(getRentPayment.execute).mockReturnValue(DETAILS);
    jest.mocked(getReceiptForPayment.execute).mockReturnValue(null);
    jest.mocked(generateReceipt.execute).mockResolvedValue(RESULT);
  });

  it('renders the preview total and allocation with the receipt whole-FCFA convention', async () => {
    const renderer = await renderScreen();
    const { root } = renderer;

    const formatted = receiptAmount(DETAILS.payment.amount, 'en');
    expect(formatted).toBe('250 FCFA');
    expect(countText(root, formatted)).toBe(2);
    expect(countText(root, '250.00')).toBe(0);
  });

  it('reports a missing payment with a way back', async () => {
    jest.mocked(getRentPayment.execute).mockReturnValue(null);

    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'Payment not found.')).toBe(true);

    await act(async () => {
      findButton(root, 'Back')?.props.onPress();
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('refuses to generate a receipt for a reversed payment', async () => {
    jest.mocked(getRentPayment.execute).mockReturnValue(REVERSED_DETAILS);

    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'A receipt cannot be created for a reversed payment.')).toBe(
      true,
    );
    expect(findButton(renderer.root, 'Finalize receipt')).toBeUndefined();
  });

  it('points to the existing receipt instead of generating a duplicate', async () => {
    jest.mocked(getReceiptForPayment.execute).mockReturnValue(EXISTING_VIEW);

    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'Already receipted')).toBe(true);
    expect(textShown(root, 'This payment already has a finalized receipt.')).toBe(true);
    expect(findButton(root, 'Finalize receipt')).toBeUndefined();

    await act(async () => {
      findButton(root, 'View receipt')?.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/receipts/receipt-1');

    await act(async () => {
      findButton(root, 'Close')?.props.onPress();
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('finalizes the receipt, shows the number and can navigate to it', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Finalize receipt')?.props.onPress();
    });

    expect(generateReceipt.execute).toHaveBeenCalledWith({ paymentId: 'payment-1', language: 'en' });
    expect(textShown(renderer.root, 'Receipt ready')).toBe(true);
    expect(textShown(renderer.root, 'Receipt RCP-000001')).toBe(true);

    await act(async () => {
      findButton(renderer.root, 'View receipt')?.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/receipts/receipt-1');
  });

  it('disables the action and shows progress while generating', async () => {
    jest
      .mocked(generateReceipt.execute)
      .mockReturnValue(new Promise<GenerateReceiptResult>(() => {}));

    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Finalize receipt')?.props.onPress();
    });

    expect(textShown(renderer.root, 'Finalize receipt')).toBe(false);
    const loadingButton = findButton(renderer.root, 'Creating receipt...');
    expect(loadingButton).toBeDefined();
    expect(loadingButton?.props.disabled).toBe(true);
  });

  it('mentions optional images that were left out of the saved receipt', async () => {
    jest.mocked(generateReceipt.execute).mockResolvedValue(RESULT_WITH_OMISSIONS);

    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Finalize receipt')?.props.onPress();
    });

    expect(
      textShown(renderer.root, 'Some optional images were missing and were left out: Logo.'),
    ).toBe(true);
  });

  it('reports an expired subscription when generation is blocked', async () => {
    jest.mocked(generateReceipt.execute).mockRejectedValue(new SubscriptionExpiredError());

    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Finalize receipt')?.props.onPress();
    });

    expect(
      textShown(renderer.root, 'Your subscription has expired. Renew it to generate receipts.'),
    ).toBe(true);
  });

  it('reports a generic failure when generation fails unexpectedly', async () => {
    jest.mocked(generateReceipt.execute).mockRejectedValue(new Error('boom'));

    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Finalize receipt')?.props.onPress();
    });

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
  });
});
