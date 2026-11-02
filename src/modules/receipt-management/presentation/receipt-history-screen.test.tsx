import { router, useFocusEffect } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import type { ReceiptListItem } from '../application/list-receipts';
import { Receipt } from '../domain/receipt';
import type { ReceiptSnapshotData } from '../domain/receipt-snapshot';
import { listReceipts } from '../infrastructure/composition-root';
import { ReceiptHistoryScreen } from './receipt-history-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  listReceipts: { execute: jest.fn() },
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

function makeReceipt(
  id: string,
  receiptNumber: string,
  overrides: Partial<ReceiptSnapshotData> = {},
): Receipt {
  const snapshot: ReceiptSnapshotData = { ...BASE_SNAPSHOT, ...overrides, receiptNumber };
  return Receipt.hydrate({
    id,
    receiptNumber,
    paymentId: `payment-${id}`,
    agreementId: 'agreement-1',
    language: 'en',
    snapshot,
    documentFileRef: `receipts/${id}.pdf`,
    documentSize: 987,
    createdAt: 1000,
  });
}

const ITEMS: ReceiptListItem[] = [
  {
    receipt: makeReceipt('receipt-1', 'RCP-000001', {
      tenant: { fullName: 'Amina Njeri', phone: null },
    }),
    reversed: false,
  },
  {
    receipt: makeReceipt('receipt-2', 'RCP-000002', {
      tenant: { fullName: 'Koffi Mensah', phone: null },
    }),
    reversed: true,
  },
];

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
    renderer = create(<ReceiptHistoryScreen />);
  });
  return renderer;
}

describe('ReceiptHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocale('en');
    jest.mocked(useFocusEffect).mockImplementation((callback) => {
      useEffect(callback, [callback]);
    });
    jest.mocked(listReceipts.execute).mockReturnValue(ITEMS);
  });

  it('shows a loading indicator before the history is loaded', async () => {
    jest.mocked(useFocusEffect).mockImplementation(() => {});

    const renderer = await renderScreen();

    expect(textContaining(renderer.root, '…')).toBe(true);
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(false);
  });

  it('lists receipts with their number, tenant and issued date', async () => {
    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'RCP-000001')).toBe(true);
    expect(textShown(root, 'RCP-000002')).toBe(true);
    expect(textShown(root, 'Amina Njeri')).toBe(true);
    expect(textShown(root, 'Koffi Mensah')).toBe(true);
    expect(textContaining(root, 'Issued')).toBe(true);
  });

  it('flags a reversed payment receipt in the list', async () => {
    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'Reversed')).toBe(true);
  });

  it('opens a receipt when its row is tapped', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'RCP-000001')?.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith('/receipts/receipt-1');
  });

  it('shows an empty message when there are no receipts', async () => {
    jest.mocked(listReceipts.execute).mockReturnValue([]);

    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'No receipts yet.')).toBe(true);
  });

  it('shows an error message and a way back when loading fails', async () => {
    jest.mocked(listReceipts.execute).mockImplementation(() => {
      throw new Error('database unavailable');
    });

    const renderer = await renderScreen();
    const { root } = renderer;

    expect(textShown(root, 'Could not load receipts. Please try again.')).toBe(true);

    await act(async () => {
      findButton(root, 'Back')?.props.onPress();
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
