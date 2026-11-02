import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { PropertyForm, type PropertyFormMode, type PropertyFormValues } from './property-form';

jest.setTimeout(30_000);

function findInput(root: ReactTestInstance, label: string) {
  const inputs = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onChangeText?: unknown };
    const parentProps = instance.parent?.props as { accessibilityLabel?: string } | undefined;
    return (
      props.accessibilityLabel === label &&
      typeof props.onChangeText === 'function' &&
      parentProps?.accessibilityLabel !== label
    );
  });
  expect(inputs).toHaveLength(1);
  return inputs[0]!.props as { value: string; onChangeText: (value: string) => void };
}

function findButton(root: ReactTestInstance, label: string) {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  expect(buttons).toHaveLength(1);
  return buttons[0]!.props as { onPress: () => void };
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === message);
}

async function renderForm(
  props: Partial<{ mode: PropertyFormMode; initialValues: Partial<PropertyFormValues> }> = {},
) {
  const onSubmit = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <PropertyForm mode={props.mode ?? 'create'} initialValues={props.initialValues} onSubmit={onSubmit} />,
    );
  });
  return { root: renderer.root, onSubmit };
}

describe('PropertyForm', () => {
  it('requires a name and an address before submitting', async () => {
    const { root, onSubmit } = await renderForm();

    await act(async () => {
      findButton(root, 'Save').onPress();
    });

    expect(textShown(root, 'Property name is required.')).toBe(true);
    expect(textShown(root, 'Property address is required.')).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the entered values once both required fields are filled', async () => {
    const { root, onSubmit } = await renderForm();

    await act(async () => {
      findInput(root, 'Name').onChangeText('Green Valley Estate');
      findInput(root, 'Address').onChangeText('12 Main Street');
      findInput(root, 'Description').onChangeText('Near the market');
    });
    await act(async () => {
      findButton(root, 'Save').onPress();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Green Valley Estate',
      address: '12 Main Street',
      description: 'Near the market',
    });
  });

  it('prefills the fields when editing an existing property', async () => {
    const { root } = await renderForm({
      mode: 'edit',
      initialValues: { name: 'Green Valley Estate', address: '12 Main Street', description: 'Near the market' },
    });

    const texts = root.findAllByType(Text).map((instance) => instance.props.children);
    expect(texts).toContain('🏠 Edit property');
    expect(findInput(root, 'Name').value).toBe('Green Valley Estate');
    expect(findInput(root, 'Address').value).toBe('12 Main Street');
  });

  it('surfaces an upstream error message', async () => {
    let renderer!: ReactTestRenderer;
    const onSubmit = jest.fn();
    await act(async () => {
      renderer = create(
        <PropertyForm mode="create" error="Something went wrong. Please try again." onSubmit={onSubmit} />,
      );
    });

    expect(textShown(renderer.root, 'Something went wrong. Please try again.')).toBe(true);
  });
});