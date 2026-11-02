import { router } from 'expo-router';
import { Alert, Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import { ReceiptDocumentMissingError } from '../application/errors';
import type { ReceiptView } from '../application/get-receipt';
import { Receipt } from '../domain/receipt';
import type { ReceiptSnapshotData } from '../domain/receipt-snapshot';
import { getReceipt, printReceipt, shareReceipt } from '../infrastructure/composition-root';
import { ReceiptDetailsScreen } from './receipt-details-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  getReceipt: { execute: jest.fn() },
  printReceipt: { execute: jest.fn() },
  shareReceipt: { execute: jest.fn() },
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
  tenant: { fullName: 'Amina Njeri', phone: '600000000' },
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

function makeReceipt(overrides: Partial<ReceiptSnapshotData> = {}): Receipt {
  const snapshot: ReceiptSnapshotData = { ...BASE_SNAPSHOT, ...overrides };
  return Receipt.hydrate({
    id: 'receipt-1',
    receiptNumber: snapshot.receiptNumber,
    paymentId: 'payment-1',
    agreementId: 'agreement-1',
    language: 'en',
    snapshot,
    documentFileRef: 'receipts/receipt-1.pdf',
    documentSize: 987,
    createdAt: 1000,
  });
}

const RECEIPT = makeReceipt();
const OMITTED_RECEIPT = makeReceipt({
  appearance: {
    logoIncluded: false,
    signatureMode: 'SAVED',
    signatureIncluded: false,
    stampMode: 'MANUAL',
    stampIncluded: false,
    omittedAssets: ['signature'],
  },
});
const STAMP_ONLY_RECEIPT = makeReceipt({
  appearance: {
    logoIncluded: false,
    signatureMode: 'MANUAL',
    signatureIncluded: false,
    stampMode: 'SAVED',
    stampIncluded: false,
    omittedAssets: ['stamp'],
  },
});
const BOTH_OMITTED_RECEIPT = makeReceipt({
  appearance: {
    logoIncluded: false,
    signatureMode: 'SAVED',
    signatureIncluded: false,
    stampMode: 'SAVED',
    stampIncluded: false,
    omittedAssets: ['signature', 'stamp'],
  },
});
const LOGO_OMITTED_RECEIPT = makeReceipt({
  appearance: {
    logoIncluded: false,
    signatureMode: 'MANUAL',
    signatureIncluded: false,
    stampMode: 'MANUAL',
    stampIncluded: false,
    omittedAssets: ['logo'],
  },
});

const VIEW: ReceiptView = { receipt: RECEIPT, reversed: false };
const REVERSED_VIEW: ReceiptView = { receipt: RECEIPT, reversed: true };

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

function countText(root: ReactTestInstance, fragment: string): number {
  return root.findAllByType(Text).filter((instance) => instance.props.children === fragment).length;
}

function findButton(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  })[0];
}

interface AlertButton {
  text?: string;
  style?: string;
  onPress?: () => void;
}

function alertButton(alertSpy: jest.SpyInstance, label: string): AlertButton | undefined {
  const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[] | undefined;
  return buttons?.find((button) => button.text === label);
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<ReceiptDetailsScreen receiptId="receipt-1" />);
  });
  return renderer;
}

describe('ReceiptDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocale('en');
    jest.mocked(getReceipt.execute).mockReturnValue(VIEW);
    jest.mocked(printReceipt.execute).mockImplementation(async () => {});
    jest.mocked(shareReceipt.execute).mockImplementation(async () => {});
  });

  it('displays the values frozen in the saved snapshot', async () => {
    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'RCP-000001')).toBe(true);
    expect(textShown(root, 'Amina Njeri')).toBe(true);
    expect(textShown(root, 'Immeuble A')).toBe(true);
    expect(textShown(root, '2026-01-05')).toBe(true);
    expect(textContaining(root, 'Apt 3')).toBe(true);
    expect(textContaining(root, '250 FCFA')).toBe(true);
  });

  it('shows the not-found state for an unknown receipt', async () => {
    jest.mocked(getReceipt.execute).mockReturnValue(null);

    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'Receipt not found.')).toBe(true);

    await act(async () => {
      findButton(root, 'Back')?.props.onPress();
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('warns that the payment was reversed', async () => {
    jest.mocked(getReceipt.execute).mockReturnValue(REVERSED_VIEW);

    const renderer = await renderScreen();

    expect(
      textShown(
        renderer.root,
        'The payment for this receipt was reversed. The receipt is kept unchanged.',
      ),
    ).toBe(true);
  });

  it('prints the saved receipt directly when it is not reversed', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Print')?.props.onPress();
    });

    expect(printReceipt.execute).toHaveBeenCalledWith(RECEIPT);
  });

  it('shares the saved receipt directly when it is not reversed', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Share PDF')?.props.onPress();
    });

    expect(shareReceipt.execute).toHaveBeenCalledWith(RECEIPT);
  });

  it('does not print a reversed receipt when the warning is cancelled', async () => {
    jest.mocked(getReceipt.execute).mockReturnValue(REVERSED_VIEW);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Print')?.props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertButton(alertSpy, 'Cancel')?.style).toBe('cancel');
    expect(printReceipt.execute).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('prints a reversed receipt when the warning is continued', async () => {
    jest.mocked(getReceipt.execute).mockReturnValue(REVERSED_VIEW);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Print')?.props.onPress();
    });
    await act(async () => {
      alertButton(alertSpy, 'Continue')?.onPress?.();
    });

    expect(printReceipt.execute).toHaveBeenCalledWith(RECEIPT);

    alertSpy.mockRestore();
  });

  it('shares a reversed receipt only after the warning is continued', async () => {
    jest.mocked(getReceipt.execute).mockReturnValue(REVERSED_VIEW);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Share PDF')?.props.onPress();
    });

    expect(shareReceipt.execute).not.toHaveBeenCalled();

    await act(async () => {
      alertButton(alertSpy, 'Continue')?.onPress?.();
    });

    expect(shareReceipt.execute).toHaveBeenCalledWith(RECEIPT);

    alertSpy.mockRestore();
  });

  it('shows an actionable message when the finalized PDF is missing', async () => {
    jest.mocked(printReceipt.execute).mockRejectedValue(new ReceiptDocumentMissingError('receipt-1'));

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Print')?.props.onPress();
    });

    expect(
      textShown(
        renderer.root,
        'The PDF for this receipt is missing on this device and cannot be printed or shared.',
      ),
    ).toBe(true);
  });

  it('shows a generic message when the action fails unexpectedly', async () => {
    jest.mocked(shareReceipt.execute).mockRejectedValue(new Error('boom'));

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Share PDF')?.props.onPress();
    });

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
  });

  it('names an omitted saved signature exactly once, without a duplicate notice', async () => {
    jest.mocked(getReceipt.execute).mockReturnValue({ receipt: OMITTED_RECEIPT, reversed: false });

    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'No image chosen.')).toBe(true);
    expect(textShown(root, 'Manual stamp')).toBe(true);
    expect(textShown(root, 'Manual signature')).toBe(false);
    expect(countText(root, 'Left out because unavailable: Signature.')).toBe(1);
  });

  it('names an omitted saved stamp exactly once, without a duplicate notice', async () => {
    jest.mocked(getReceipt.execute).mockReturnValue({ receipt: STAMP_ONLY_RECEIPT, reversed: false });

    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'Manual signature')).toBe(true);
    expect(textShown(root, 'Manual stamp')).toBe(false);
    expect(countText(root, 'Left out because unavailable: Stamp.')).toBe(1);
  });

  it('names each omitted saved signature and stamp exactly once', async () => {
    jest.mocked(getReceipt.execute).mockReturnValue({ receipt: BOTH_OMITTED_RECEIPT, reversed: false });

    const renderer = await renderScreen();
    const { root } = renderer;

    expect(countText(root, 'Left out because unavailable: Signature.')).toBe(1);
    expect(countText(root, 'Left out because unavailable: Stamp.')).toBe(1);
  });

  it('still reports an omitted logo, which has no inline notice of its own', async () => {
    jest.mocked(getReceipt.execute).mockReturnValue({ receipt: LOGO_OMITTED_RECEIPT, reversed: false });

    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'No image chosen.')).toBe(true);
    expect(textShown(root, 'Manual signature')).toBe(true);
    expect(textShown(root, 'Manual stamp')).toBe(true);
    expect(countText(root, 'Left out because unavailable: Logo.')).toBe(1);
  });

  it('disables both print and share while an action is pending and recovers afterwards', async () => {
    let release!: () => void;
    jest.mocked(printReceipt.execute).mockImplementation(
      () => new Promise<void>((resolve) => {
        release = resolve;
      }),
    );

    const renderer = await renderScreen();
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Print')?.props.onPress();
    });

    expect(findButton(root, 'Print')?.props.disabled).toBe(true);
    expect(findButton(root, 'Share PDF')?.props.disabled).toBe(true);

    await act(async () => {
      release();
    });

    expect(findButton(root, 'Print')?.props.disabled).toBeFalsy();
    expect(findButton(root, 'Share PDF')?.props.disabled).toBeFalsy();
  });

  it('re-enables the actions after a failure', async () => {
    jest.mocked(printReceipt.execute).mockRejectedValue(new Error('boom'));

    const renderer = await renderScreen();
    const { root } = renderer;

    await act(async () => {
      findButton(root, 'Print')?.props.onPress();
    });

    expect(findButton(root, 'Print')?.props.disabled).toBeFalsy();
    expect(findButton(root, 'Share PDF')?.props.disabled).toBeFalsy();
  });

  it('opens only one confirmation dialog when the action is tapped repeatedly', async () => {
    jest.mocked(getReceipt.execute).mockReturnValue(REVERSED_VIEW);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const renderer = await renderScreen();
    const { root } = renderer;

    await act(async () => {
      const print = findButton(root, 'Print');
      print?.props.onPress();
      print?.props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });

  it('navigates back to the originating payment', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Back to payment')?.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/rent/payments/payment-1');
  });
});
