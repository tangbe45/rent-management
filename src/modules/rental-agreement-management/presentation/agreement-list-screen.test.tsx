import { router, useFocusEffect } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { RentalAgreementListPage } from '../application/list-rental-agreements';
import { RentalAgreement } from '../domain/rental-agreement';
import { listRentalAgreements } from '../infrastructure/composition-root';
import { AgreementListScreen } from './agreement-list-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  listRentalAgreements: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function buildAgreement(id: string, startDate: string): RentalAgreement {
  return RentalAgreement.create({
    id,
    tenantId: `tenant-${id}`,
    spaceId: `space-${id}`,
    startDate,
    rentAmount: 100_000,
    rentFrequency: 'MONTHLY',
    firstRentDueDate: startDate,
    createdAt: 1,
  });
}

function buildPage(
  entries: readonly { id: string; startDate: string; tenantName: string }[],
  total = entries.length,
): RentalAgreementListPage {
  return {
    items: entries.map((entry) => ({
      agreement: buildAgreement(entry.id, entry.startDate),
      lifecycle: 'ACTIVE',
      tenantName: entry.tenantName,
      propertyName: 'Sunset Apartments',
      spaceName: 'Apartment A',
    })),
    total,
  };
}

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
    renderer = create(<AgreementListScreen />);
  });
  return renderer;
}

function emitFocus(): void {
  const calls = jest.mocked(useFocusEffect).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  act(() => {
    calls[calls.length - 1]![0]();
  });
}

describe('AgreementListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(listRentalAgreements.execute).mockReturnValue(buildPage([]));
  });

  it('renders agreements and opens one on press', async () => {
    jest
      .mocked(listRentalAgreements.execute)
      .mockReturnValue(buildPage([{ id: 'a1', startDate: '2026-01-01', tenantName: 'Amina Njeri' }]));

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Amina Njeri')).toBe(true);
    expect(textShown(renderer.root, 'Sunset Apartments · Apartment A')).toBe(true);
    expect(textContaining(renderer.root, '1,000 FCFA · Monthly')).toBe(true);

    await act(async () => {
      findButton(renderer.root, 'Amina Njeri')?.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/agreements/a1');
  });

  it('filters by lifecycle and passes the derived lifecycle to the query', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Active')?.props.onPress();
    });
    expect(listRentalAgreements.execute).toHaveBeenCalledWith({ lifecycle: 'ACTIVE' });

    await act(async () => {
      findButton(renderer.root, 'All')?.props.onPress();
    });
    expect(listRentalAgreements.execute).toHaveBeenCalledWith({ lifecycle: undefined });
  });

  it('loads more with the current offset and appends the next page', async () => {
    jest
      .mocked(listRentalAgreements.execute)
      .mockReturnValueOnce(buildPage([{ id: 'a1', startDate: '2026-01-01', tenantName: 'Amina' }], 2))
      .mockReturnValueOnce(buildPage([{ id: 'a2', startDate: '2026-02-01', tenantName: 'Brian' }], 2));

    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Load more')?.props.onPress();
    });

    expect(listRentalAgreements.execute).toHaveBeenLastCalledWith({
      lifecycle: undefined,
      offset: 1,
    });
    expect(textShown(renderer.root, 'Amina')).toBe(true);
    expect(textShown(renderer.root, 'Brian')).toBe(true);
  });

  it('reloads on focus and creates through the add button', async () => {
    const renderer = await renderScreen();
    emitFocus();
    expect(useFocusEffect).toHaveBeenCalledTimes(1);

    await act(async () => {
      findButton(renderer.root, 'Create agreement')?.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/agreements/new');
  });
});
