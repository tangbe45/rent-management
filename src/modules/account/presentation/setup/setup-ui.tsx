import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export const palette = {
  background: '#F4F1EA',
  surface: '#FFFFFF',
  primary: '#2F6B4F',
  primaryPressed: '#285D43',
  text: '#1F2933',
  textMuted: '#6B7280',
  border: '#E2DCD0',
  danger: '#B3261E',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function PrimaryButton({ title, onPress, disabled, loading }: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.button, (pressed || isDisabled) && styles.buttonPressed]}
    >
      {loading ? (
        <ActivityIndicator color={palette.white} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface FieldProps {
  label: string;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  onChangeText: (value: string) => void;
}

export function Field({
  label,
  placeholder,
  error,
  secureTextEntry,
  keyboardType,
  autoFocus,
  onSubmitEditing,
  onChangeText,
}: FieldProps) {
  const [value, setValue] = useState('');
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(next) => {
          setValue(next);
          onChangeText(next);
        }}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={label}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

interface KeyboardSafeContainerProps {
  children: React.ReactNode;
}

export function KeyboardSafeContainer({ children }: KeyboardSafeContainerProps) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.centered}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flexGrow: 1,
  },
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.xl,
    gap: spacing.l,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: palette.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.l,
    gap: spacing.m,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.08,
    elevation: 3,
  },
  button: {
    backgroundColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ translateY: 1 }],
  },
  buttonText: {
    color: palette.white,
    fontSize: 17,
    fontWeight: '600',
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: 14,
    color: palette.text,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    backgroundColor: palette.background,
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    fontSize: 16,
    color: palette.text,
  },
  inputError: {
    borderColor: palette.danger,
  },
  fieldError: {
    fontSize: 13,
    color: palette.danger,
  },
});