import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { RentPaymentDetails } from '../application/get-rent-payment';
import { InvalidRentPaymentReversalError } from '../domain/payment-reversal';
import { getRentPayment, reverseRentPayment } from '../infrastructure/composition-root';
import { getReceiptForPayment } from '../../receipt-management/infrastructure/composition-root';
import { RentPaymentDetailsScreen } from './rent-payment-details-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  getRentPayment: { execute: jest.fn() },
  reverseRentPayment: { execute: jest.fn() },
}));

jest.mock('../../receipt-management/infrastructure/composition-root', () => ({
  getReceiptForPayment: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

const PAYMENT_DETAILS: RentPaymentDetails = {
  payment: {
    id: 'payment-1',
    agreementId: 'agreement-1',
    amount: 50_000,
    paymentDate: '2026-01-05',
    method: 'CASH',
    reference: null,
    notes: null,
    createdAt: 1,
  },
  reversal: null,
  allocations: [{ installmentId: 'installment-1', installmentDueDate: '2026-01-01', amount: 50_000 }],
};

const REVERSED_DETAILS: RentPaymentDetails = {
  ...PAYMENT_DETAILS,
  reversal: {
    paymentId: 'payment-1',
    reason: 'DUPLICATE',
    explanation: null,
    reversedAt: 1_700_000_000_000,
  },
};

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === fragment);
}

function textContaining(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some(
      (instance) =>
        typeof instance.props.children === 'string' && instance.props.children.includes(fragment),
    );
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
    renderer = create(<RentPaymentDetailsScreen paymentId="payment-1" />);
  });
  return renderer;
}

describe('RentPaymentDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getRentPayment.execute).mockReturnValue(PAYMENT_DETAILS);
    jest.mocked(getReceiptForPayment.execute).mockReturnValue(null);
  });

  it('shows the payment fields and the periods it covered', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    expect(textShown(root, '2026-01-05')).toBe(true);
    expect(textShown(root, 'Cash')).toBe(true);
    expect(textShown(root, '2026-01-01')).toBe(true);
    expect(textShown(root, 'None')).toBe(true);
    expect(textContaining(root, '500 FCFA')).toBe(true);
    expect(textContaining(root, '.00')).toBe(false);
  });

  it('requires an explanation when reversing for the "Other" reason', async () => {
    jest.mocked(reverseRentPayment.execute).mockImplementation(() => {
      throw new InvalidRentPaymentReversalError(
        'An explanation is required when the reversal reason is "Other".',
      );
    });

    const renderer = await renderScreen();
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Reverse payment')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Other')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Confirm reversal')?.props.onPress();
    });

    expect(reverseRentPayment.execute).toHaveBeenCalledWith({
      paymentId: 'payment-1',
      reason: 'OTHER',
      explanation: '',
    });
    expect(textShown(root, 'Explain why the payment is being reversed.')).toBe(true);  });

  it('shows the reversal banner once a payment is reversed', async () => {
    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'Reverse payment')).toBe(true);

    jest.mocked(getRentPayment.execute).mockReturnValue(REVERSED_DETAILS);

    await act(async () => {
      findButton(root, 'Reverse payment')?.props.onPress();
    });
    await act(async () => {
      findButton(root, 'Confirm reversal')?.props.onPress();
    });

    expect(reverseRentPayment.execute).toHaveBeenCalledWith({
      paymentId: 'payment-1',
      reason: 'WRONG_AMOUNT',
      explanation: '',
    });
    expect(textShown(root, 'Duplicate payment')).toBe(true);
  });

  it('shows a not-found message when the payment is missing', async () => {
    jest.mocked(getRentPayment.execute).mockReturnValue(null);
    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'Payment not found.')).toBe(true);
  });
});
