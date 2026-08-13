import type { Tile, TileColor } from '@luma/game-core';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTranslation } from 'react-i18next';
import { palette, radius } from '../theme/tokens';
import { resolveRackGesture, type RackDropDirection } from '../services/table-interaction';

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
  onDiscard?: (() => void) | undefined;
  discardEnabled?: boolean;
  discardDirection?: RackDropDirection;
  interactionEnabled?: boolean;
  onDragActive?: ((active: boolean) => void) | undefined;
  reducedMotion: boolean;
  theme?: 'luma' | 'kahvehane';
  rowStride?: number;
  rowStep?: number;
}

export function TileCard({
  tile,
  selected,
  width,
  onPress,
  onMove,
  onDiscard,
  discardEnabled = false,
  discardDirection = 'up',
  interactionEnabled = true,
  onDragActive,
  reducedMotion,
  theme = 'luma',
  rowStride = 0,
  rowStep = 1,
}: TileCardProps) {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pan = Gesture.Pan()
    .enabled(interactionEnabled)
    .minDistance(8)
    .onTouchesDown(() => {
      if (onDragActive !== undefined) scheduleOnRN(onDragActive, true);
    })
    .onStart(() => {
      if (onDragActive !== undefined) scheduleOnRN(onDragActive, true);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = reducedMotion ? 0 : Math.max(-rowStep, Math.min(rowStep, event.translationY));
    })
    .onEnd((event) => {
      const outcome = resolveRackGesture({
        translationX: event.translationX,
        translationY: event.translationY,
        tileWidth: width,
        rowStride,
        rowStep,
        discardEnabled,
        discardDirection,
      });
      if (outcome.kind === 'discard' && onDiscard !== undefined) scheduleOnRN(onDiscard);
      if (outcome.kind === 'move') scheduleOnRN(onMove, outcome.delta);
    })
    .onFinalize(() => {
      if (onDragActive !== undefined) scheduleOnRN(onDragActive, false);
      translateX.value = reducedMotion ? 0 : withSpring(0, { damping: 20, stiffness: 260 });
      translateY.value = reducedMotion ? 0 : withSpring(0, { damping: 20, stiffness: 260 });
    });
  const tap = Gesture.Tap()
    .enabled(interactionEnabled)
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(onPress);
    });
  const gesture = Gesture.Exclusive(pan, tap);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { translateY: selected ? -10 : 0 }],
    zIndex: Math.abs(translateX.value) > 1 ? 20 : selected ? 10 : 1,
  }));
  const colorName = tile.color === undefined ? '' : t(`color.${tile.color}`);
  const label = tile.kind === 'false_joker' ? t('a11y.falseJoker') : t('a11y.tile', { color: colorName, number: tile.number });
  const height = Math.round(Math.max(56, Math.min(72, width * 1.55)));
  const numberSize = Math.round(Math.max(17, Math.min(23, width * 0.57)));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animatedStyle, { width }]}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected, disabled: !interactionEnabled }}
          onAccessibilityTap={interactionEnabled ? onPress : undefined}
          accessibilityActions={interactionEnabled ? [{ name: 'activate' }] : undefined}
          onAccessibilityAction={interactionEnabled ? (event) => {
            if (event.nativeEvent.actionName === 'activate') onPress();
          } : undefined}
          style={[
            styles.tile,
            {
              width,
              height,
              borderColor: selected ? palette.aqua : palette.tileBorder,
              shadowColor: selected ? palette.aqua : palette.black,
              backgroundColor: theme === 'kahvehane' ? '#F6EEDB' : palette.tileIvory,
            },
          ]}
        >
          {theme === 'kahvehane' && <View pointerEvents="none" style={styles.patina} />}
          <View style={[styles.glyph, { backgroundColor: tile.kind === 'false_joker' ? palette.lilac : inkByColor[tile.color ?? 'black'] }]} />
          <Text
            allowFontScaling={false}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            numberOfLines={1}
            style={[
              styles.number,
              {
                color: tile.kind === 'false_joker' ? palette.lilac : inkByColor[tile.color ?? 'black'],
                fontSize: numberSize,
                lineHeight: numberSize + 2,
              },
            ]}
          >
            {tile.kind === 'false_joker' ? '✦' : tile.number}
          </Text>
          <View style={[styles.underline, { backgroundColor: tile.kind === 'false_joker' ? palette.lilac : inkByColor[tile.color ?? 'black'] }]} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.sm,
    borderWidth: 2,
    backgroundColor: palette.tileIvory,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  glyph: { width: 6, height: 6, borderRadius: 3 },
  number: {
    width: '100%',
    paddingHorizontal: 1,
    textAlign: 'center',
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
  underline: { width: 16, height: 3, borderRadius: 2 },
  patina: { position: 'absolute', left: 5, top: 6, width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(126,87,48,0.22)' },
});
