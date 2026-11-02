import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, spacing, styles } from '../../account/presentation/setup/setup-ui';

export function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [tenantUiStyles.secondary, pressed && tenantUiStyles.pressed]}
    >
      <Text style={tenantUiStyles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

export function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => (pressed ? tenantUiStyles.pressed : undefined)}
    >
      <Text style={tenantUiStyles.link}>{title}</Text>
    </Pressable>
  );
}

export function TenantMessage({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>{title}</Text>
      <SecondaryButton title={actionLabel} onPress={onAction} />
    </View>
  );
}

export function formatTimestamp(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleDateString(locale);
}

export const tenantUiStyles = StyleSheet.create({
  secondary: {
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryText: {
    color: palette.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  link: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing.s,
  },
  pressed: {
    opacity: 0.75,
  },
});
