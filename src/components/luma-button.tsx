import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '../hooks/use-app-theme';
import { useAppStore } from '../stores/app-store';
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
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const backgroundColor = variant === 'primary' ? palette.aqua : variant === 'danger' ? palette.danger : colors.elevated;
  const textColor = variant === 'primary' ? palette.ink : variant === 'danger' ? palette.white : colors.text;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={() => {
        scale.value = reducedMotion ? 1 : withTiming(0.97, { duration: 120, easing: Easing.bezier(0.23, 1, 0.32, 1) });
      }}
      onPressOut={() => {
        scale.value = reducedMotion ? 1 : withTiming(1, { duration: 140, easing: Easing.bezier(0.23, 1, 0.32, 1) });
      }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.button, { backgroundColor, opacity: disabled ? 0.45 : 1 }, animatedStyle, style]}
    >
      {icon}
      <Text maxFontSizeMultiplier={1.5} numberOfLines={2} adjustsFontSizeToFit style={[styles.label, { color: textColor }]}>{label}</Text>
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
