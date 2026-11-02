import { StyleSheet } from 'react-native';

import { palette } from '../../account/presentation/setup/setup-ui';

export const listItemStyles = StyleSheet.create({
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  address: {
    fontSize: 15,
    color: palette.textMuted,
  },
  pressed: {
    opacity: 0.75,
  },
});