import type { Tile, TileColor } from '@luma/game-core';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTranslation } from 'react-i18next';
import { palette, radius } from '../theme/tokens';

const inkByColor: Record<TileColor, string> = {
  red: '#E85A67',
  blue: '#3387E8',
  black: '#20263A',
  yellow: '#D49B22',
};

interface TileCardProps {
  tile: Tile;
  selected: boolean;
  width: number;
  onPress(): void;
  onMove(delta: number): void;
  reducedMotion: boolean;
}

export function TileCard({ tile, selected, width, onPress, onMove, reducedMotion }: TileCardProps) {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = reducedMotion ? 0 : Math.min(0, event.translationY);
    })
    .onEnd((event) => {
      const delta = Math.round(event.translationX / Math.max(width, 1));
      if (delta !== 0) scheduleOnRN(onMove, delta);
      translateX.value = reducedMotion ? 0 : withSpring(0, { damping: 20, stiffness: 260 });
      translateY.value = reducedMotion ? 0 : withSpring(0, { damping: 20, stiffness: 260 });
    });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { translateY: selected ? -10 : 0 }],
    zIndex: Math.abs(translateX.value) > 1 ? 20 : selected ? 10 : 1,
  }));
  const colorName = tile.color === undefined ? '' : t(`color.${tile.color}`);
  const label = tile.kind === 'false_joker' ? t('a11y.falseJoker') : t('a11y.tile', { color: colorName, number: tile.number });
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[animatedStyle, { width }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected }}
          onPress={onPress}
          style={[
            styles.tile,
            {
              width,
              borderColor: selected ? palette.aqua : 'rgba(10,16,40,0.12)',
              shadowColor: selected ? palette.aqua : palette.black,
            },
          ]}
        >
          <View style={[styles.glyph, { backgroundColor: tile.kind === 'false_joker' ? palette.lilac : inkByColor[tile.color ?? 'black'] }]} />
          <Text style={[styles.number, { color: tile.kind === 'false_joker' ? palette.lilac : inkByColor[tile.color ?? 'black'] }]}>
            {tile.kind === 'false_joker' ? '✦' : tile.number}
          </Text>
          <View style={[styles.underline, { backgroundColor: tile.kind === 'false_joker' ? palette.lilac : inkByColor[tile.color ?? 'black'] }]} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  tile: {
    height: 72,
    borderRadius: radius.sm,
    borderWidth: 2,
    backgroundColor: '#F8F1E3',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  glyph: { width: 6, height: 6, borderRadius: 3 },
  number: { fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] },
  underline: { width: 16, height: 3, borderRadius: 2 },
});
