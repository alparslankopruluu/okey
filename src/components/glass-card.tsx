import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { radius, space } from '../theme/tokens';

export function GlassCard({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    overflow: 'hidden',
  },
});
