import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '../hooks/use-app-theme';
import { palette, radius, space } from '../theme/tokens';

interface LumaButtonProps {
  label: string;
  onPress(): void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function LumaButton({ label, onPress, icon, variant = 'primary', disabled = false, style }: LumaButtonProps) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const backgroundColor = variant === 'primary' ? palette.aqua : variant === 'danger' ? palette.danger : colors.elevated;
  const textColor = variant === 'primary' ? palette.ink : variant === 'danger' ? palette.white : colors.text;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 280 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 280 }); }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.button, { backgroundColor, opacity: disabled ? 0.45 : 1 }, animatedStyle, style]}
    >
      {icon}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  label: { fontSize: 16, fontWeight: '800' },
});
