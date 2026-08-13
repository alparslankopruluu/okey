import { Canvas, Circle, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import type { GameState, TableMeld, Tile } from '@luma/game-core';
import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTranslation } from 'react-i18next';
import { AvatarMedallion } from './avatar-medallion';
import { TileFace } from './tile-face';
import { palette, radius } from '../theme/tokens';
import { images } from '../assets';

export interface SeatDiscard {
  readonly playerId: string;
  readonly tile: Tile;
  /** Only the globally top, legal discard should be marked actionable. */
  readonly actionable?: boolean | undefined;
  readonly accessibilityLabel?: string | undefined;
}

export interface TableGiftEvent {
  readonly id: string;
  readonly fromSeatIndex: number;
  readonly toSeatIndex: number;
  readonly giftId: keyof typeof images.gifts;
  readonly accessibilityLabel: string;
}

interface OkeyTableProps {
  readonly state: GameState;
  readonly width: number;
  readonly height: number;
  readonly lowPerformance: boolean;
  readonly playerNames: readonly string[];
  readonly wallLabel: string;
  readonly latestDiscards?: readonly SeatDiscard[] | undefined;
  readonly onDiscardPress?: ((discard: SeatDiscard) => void) | undefined;
  readonly indicatorTile?: Tile | undefined;
  readonly reducedMotion?: boolean | undefined;
  readonly giftEvent?: TableGiftEvent | undefined;
  readonly onSeatPress?: ((seatIndex: number) => void) | undefined;
  readonly theme?: 'luma' | 'kahvehane';
  readonly wallDrawEnabled?: boolean;
  readonly onWallDraw?: (() => void) | undefined;
  readonly wallDropDirection?: 'down' | 'right';
  readonly rackDropActive?: boolean;
}

interface SeatPosition {
  readonly left?: number;
  readonly right?: number;
  readonly top?: number;
  readonly bottom?: number;
}

const seatIndexForPlayer = (state: GameState, playerId: string) => state.players.findIndex((player) => player.id === playerId);

function fallbackDiscards(state: GameState): readonly SeatDiscard[] {
  const latest = state.discards.at(-1);
  if (latest === undefined) return [];
  const ownerIndex = (state.turnIndex - 1 + state.players.length) % state.players.length;
  const owner = state.players[ownerIndex];
  return owner === undefined ? [] : [{ playerId: owner.id, tile: latest }];
}

function CommittedDiscard({ discard, size, reducedMotion, onPress }: { discard: SeatDiscard; size: number; reducedMotion: boolean; onPress?: (() => void) | undefined }) {
  const entered = useSharedValue(0);
  useEffect(() => {
    entered.value = withTiming(1, { duration: reducedMotion ? 110 : 180, easing: Easing.out(Easing.cubic) });
  }, [discard.tile.id, entered, reducedMotion]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: entered.value,
    transform: [{ scale: reducedMotion ? 1 : 0.9 + entered.value * 0.1 }],
  }));
  return (
    <Animated.View style={[styles.discard, discard.actionable && styles.actionableDiscard, animatedStyle]}>
      <TileFace tile={discard.tile} size={size} highlighted={discard.actionable} accessibilityLabel={discard.accessibilityLabel} onPress={discard.actionable ? onPress : undefined} />
    </Animated.View>
  );
}

function MeldGroup({ meld, compact, reducedMotion }: { meld: TableMeld; compact: boolean; reducedMotion: boolean }) {
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: reducedMotion ? 120 : 230, easing: Easing.out(Easing.cubic) });
  }, [meld.id, progress, reducedMotion]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: reducedMotion ? 1 : 0.94 + progress.value * 0.06 }],
  }));
  const label = meld.tiles.map((tile) => tile.kind === 'false_joker'
    ? t('a11y.falseJoker')
    : t('a11y.tile', { color: t(`color.${tile.color ?? 'black'}`), number: tile.number })).join(', ');
  return (
    <Animated.View accessible accessibilityLabel={label} style={[styles.meld, animatedStyle]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.meldTiles}>
        {meld.tiles.map((tile) => <TileFace key={tile.id} tile={tile} size={compact ? 20 : 24} />)}
      </View>
    </Animated.View>
  );
}

function GiftFlight({ event, width, height, reducedMotion }: { event: TableGiftEvent; width: number; height: number; reducedMotion: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: reducedMotion ? 140 : 550, easing: Easing.out(Easing.cubic) });
  }, [event.id, progress, reducedMotion]);
  const fallbackAnchor = { x: width * 0.5, y: height * 0.5 };
  const anchors = [
    { x: width * 0.5, y: height * 0.84 },
    { x: width * 0.17, y: height * 0.5 },
    { x: width * 0.5, y: height * 0.16 },
    { x: width * 0.83, y: height * 0.5 },
  ];
  const from = anchors[event.fromSeatIndex] ?? fallbackAnchor;
  const to = anchors[event.toSeatIndex] ?? fallbackAnchor;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.9 ? 1 : (1 - progress.value) * 10,
    transform: [
      { translateX: (to.x - from.x) * progress.value },
      { translateY: (to.y - from.y) * progress.value },
      { scale: reducedMotion ? 1 : 0.84 + Math.min(progress.value * 1.3, 1) * 0.16 },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden style={[styles.gift, { left: from.x - 20, top: from.y - 20 }, animatedStyle]}>
      <Image accessibilityLabel={event.accessibilityLabel} source={images.gifts[event.giftId]} style={styles.giftImage} />
    </Animated.View>
  );
}

function WinnerGlow({ winnerId, label, reducedMotion, lowPerformance }: { winnerId: string; label: string; reducedMotion: boolean; lowPerformance: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: reducedMotion ? 140 : 320, easing: Easing.out(Easing.cubic) });
  }, [progress, reducedMotion, winnerId]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: reducedMotion ? progress.value * 0.72 : progress.value }));
  return (
    <Animated.View pointerEvents="none" accessible accessibilityRole="text" accessibilityLabel={label} style={[styles.winnerGlow, animatedStyle]}>
      {!reducedMotion && !lowPerformance && (
        <View accessibilityElementsHidden style={styles.winnerParticles}>
          {Array.from({ length: 8 }, (_, index) => (
            <View
              key={index}
              style={[
                styles.winnerParticle,
                {
                  left: `${12 + ((index * 19) % 76)}%`,
                  top: `${16 + ((index * 23) % 64)}%`,
                  backgroundColor: index % 2 === 0 ? palette.aqua : palette.lilac,
                },
              ]}
            />
          ))}
        </View>
      )}
      <View style={styles.winnerCard}>
        <Text style={styles.winnerLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

function DraggableWall({ count, label, enabled, reducedMotion, dropDirection, onDraw }: {
  count: number;
  label: string;
  enabled: boolean;
  reducedMotion: boolean;
  dropDirection: 'down' | 'right';
  onDraw?: (() => void) | undefined;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const pan = Gesture.Pan()
    .enabled(enabled && onDraw !== undefined)
    .minDistance(8)
    .onUpdate((event) => {
      const distance = Math.sqrt(event.translationX ** 2 + event.translationY ** 2);
      translateX.value = reducedMotion ? 0 : Math.max(-110, Math.min(110, event.translationX));
      translateY.value = reducedMotion ? 0 : Math.max(-90, Math.min(90, event.translationY));
      opacity.value = reducedMotion ? (distance > 40 ? 0.62 : 1) : 1;
    })
    .onEnd((event) => {
      const towardRack = dropDirection === 'right' ? event.translationX : event.translationY;
      const crossAxis = dropDirection === 'right' ? Math.abs(event.translationY) : Math.abs(event.translationX);
      if (towardRack > 48 && crossAxis < towardRack * 0.9 && onDraw !== undefined) scheduleOnRN(onDraw);
      translateX.value = withTiming(0, { duration: reducedMotion ? 0 : 160 });
      translateY.value = withTiming(0, { duration: reducedMotion ? 0 : 160 });
      opacity.value = withTiming(1, { duration: reducedMotion ? 0 : 120 });
    });
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: translateX.value }, { translateY: translateY.value }] }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.centerPile, enabled && styles.actionableWall, animatedStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={enabled ? label : undefined}
          accessibilityState={{ disabled: !enabled }}
          disabled={!enabled}
          onPress={onDraw}
          style={styles.wallPressable}
        >
          <Text allowFontScaling={false} style={styles.wallCount}>{count}</Text>
          <Text allowFontScaling={false} style={styles.wallLabel}>{label}</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export function OkeyTable({
  state,
  width,
  height,
  lowPerformance,
  playerNames,
  wallLabel,
  latestDiscards,
  onDiscardPress,
  indicatorTile,
  reducedMotion = false,
  giftEvent,
  onSeatPress,
  theme = 'luma',
  wallDrawEnabled = false,
  onWallDraw,
  wallDropDirection = 'down',
  rackDropActive = false,
}: OkeyTableProps) {
  const { t } = useTranslation();
  const compact = height < 250 || width < 350;
  const seatSize = compact ? 48 : 56;
  const positions: readonly SeatPosition[] = [
    { left: width / 2 - seatSize / 2, bottom: 7 },
    { left: 7, top: height / 2 - seatSize / 2 },
    { left: width / 2 - seatSize / 2, top: 7 },
    { right: 7, top: height / 2 - seatSize / 2 },
  ];
  const discards = latestDiscards ?? fallbackDiscards(state);
  const visibleDiscards = discards.filter((discard) => seatIndexForPlayer(state, discard.playerId) >= 0);
  const winnerIds = state.settlement?.winnerIds ?? (state.winnerId === undefined ? [] : [state.winnerId]);
  const winnerNames = winnerIds.map((winnerId) => {
    const winnerIndex = seatIndexForPlayer(state, winnerId);
    return winnerIndex === 0 ? t('game.youWon') : playerNames[winnerIndex] ?? winnerId;
  });
  const winnerLabel = winnerNames.length === 1
    ? winnerIds[0] === state.players[0]?.id
      ? t('game.youWon')
      : t('game.roundWinner', { name: winnerNames[0] })
    : t('game.roundWinners', { names: winnerNames.join(', ') });

  return (
    <View accessibilityLabel={state.variant === 'classic' ? t('game.classic') : t('game.101')} style={[styles.root, { width, height }]}>
      {theme === 'kahvehane' && (
        <Image
          accessibilityElementsHidden
          blurRadius={lowPerformance ? 0 : 0.4}
          resizeMode="cover"
          source={images.themes.kahvehaneStyleFrame}
          style={[StyleSheet.absoluteFill, styles.kahvehaneBackdrop]}
        />
      )}
      <Canvas style={StyleSheet.absoluteFill}>
        <RoundedRect x={2} y={2} width={width - 4} height={height - 4} r={Math.min(radius.lg * 2, height / 3)}>
          <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={theme === 'kahvehane' ? ['rgba(107,53,27,0.88)', 'rgba(46,22,12,0.92)', 'rgba(91,42,20,0.88)'] : ['#263B68', '#121B3B', '#29325D']} />
        </RoundedRect>
        <RoundedRect x={18} y={18} width={width - 36} height={height - 36} r={Math.min(radius.lg * 1.7, height / 3)} color={theme === 'kahvehane' ? 'rgba(78,37,18,0.72)' : '#172B50'} />
        <Circle cx={width / 2} cy={height / 2} r={Math.min(width, height) * 0.14} color={theme === 'kahvehane' ? 'rgba(232,199,122,0.09)' : 'rgba(41,225,214,0.08)'} />
        {!lowPerformance && (
          <>
            <Circle cx={width * 0.2} cy={height * 0.28} r={3} color={palette.lilac} />
            <Circle cx={width * 0.78} cy={height * 0.22} r={2} color={palette.aqua} />
            <Circle cx={width * 0.7} cy={height * 0.72} r={2.5} color={palette.coral} />
          </>
        )}
      </Canvas>
      <DraggableWall count={state.wall.length} label={wallLabel} enabled={wallDrawEnabled} reducedMotion={reducedMotion || lowPerformance} dropDirection={wallDropDirection} onDraw={onWallDraw} />
      {rackDropActive && (
        <View pointerEvents="none" style={[styles.rackDropTarget, reducedMotion && styles.rackDropTargetReduced]}>
          <Text style={styles.rackDropLabel}>{t('game.dropToTable')}</Text>
        </View>
      )}
      <View style={[styles.indicator, compact && styles.indicatorCompact]} accessible accessibilityLabel={t('a11y.tile', { color: t(`color.${(indicatorTile ?? state.indicatorTile).color ?? 'black'}`), number: (indicatorTile ?? state.indicatorTile).number })}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><TileFace tile={indicatorTile ?? state.indicatorTile} size={compact ? 20 : 25} /></View>
      </View>
      {state.tableMelds.length > 0 && (
        <View style={[styles.meldArea, compact && styles.meldAreaCompact]}>
          {state.tableMelds.map((meld) => <MeldGroup key={meld.id} meld={meld} compact={compact} reducedMotion={reducedMotion} />)}
        </View>
      )}
      {state.players.map((player, index) => (
        <View key={player.id} style={[styles.seat, positions[index]]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('a11y.playerProfile', { player: playerNames[index] ?? player.id })} disabled={onSeatPress === undefined} onPress={() => onSeatPress?.(index)}>
          <AvatarMedallion index={index} size={index === 0 ? seatSize + 8 : seatSize} active={state.turnIndex === index} />
          </Pressable>
          <Text maxFontSizeMultiplier={1.35} numberOfLines={1} adjustsFontSizeToFit style={[styles.name, state.turnIndex === index && styles.activeName]}>{playerNames[index] ?? player.id}</Text>
          <Text maxFontSizeMultiplier={1.35} style={styles.count}>{player.rack.length}</Text>
          {visibleDiscards
            .filter((discard) => discard.playerId === player.id)
            .map((discard) => (
              <CommittedDiscard
                key={discard.tile.id}
                discard={discard}
                size={compact ? 23 : 28}
                reducedMotion={reducedMotion || lowPerformance}
                onPress={discard.actionable && onDiscardPress !== undefined ? () => { onDiscardPress(discard); } : undefined}
              />
            ))}
        </View>
      ))}
      {winnerIds.length > 0 && <WinnerGlow winnerId={winnerIds.join(':')} label={winnerLabel} reducedMotion={reducedMotion} lowPerformance={lowPerformance} />}
      {!lowPerformance && giftEvent !== undefined && <GiftFlight event={giftEvent} width={width} height={height} reducedMotion={reducedMotion} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'center', overflow: 'hidden' },
  kahvehaneBackdrop: { opacity: 0.34 },
  seat: { position: 'absolute', alignItems: 'center', maxWidth: 84 },
  name: { color: palette.pearl, fontSize: 11, fontWeight: '700', marginTop: 2, maxWidth: 78 },
  activeName: { color: palette.aqua },
  count: { color: palette.mutedDark, fontSize: 10, fontWeight: '700' },
  discard: { marginTop: 4, padding: 3, borderRadius: radius.sm },
  actionableDiscard: { backgroundColor: 'rgba(41,225,214,0.16)', borderWidth: 1, borderColor: palette.aqua },
  centerPile: {
    position: 'absolute', left: '42%', top: '40%', width: '16%', minWidth: 54, aspectRatio: 1.25, borderRadius: radius.sm,
    backgroundColor: palette.tileIvory, alignItems: 'center', justifyContent: 'center', shadowColor: palette.black, shadowOpacity: 0.3, shadowRadius: 8,
  },
  actionableWall: { borderWidth: 1, borderColor: palette.aqua, shadowColor: palette.aqua, shadowOpacity: 0.36 },
  rackDropTarget: { position: 'absolute', left: '31%', right: '31%', bottom: '23%', minHeight: 34, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.aqua, backgroundColor: 'rgba(41,225,214,0.14)', alignItems: 'center', justifyContent: 'center' },
  rackDropTargetReduced: { backgroundColor: 'rgba(41,225,214,0.22)' },
  rackDropLabel: { color: palette.pearl, fontSize: 10, fontWeight: '900' },
  wallPressable: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  wallCount: { color: palette.ink, fontSize: 17, fontWeight: '900' },
  wallLabel: { color: palette.mutedLight, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  indicator: { position: 'absolute', left: '31%', top: '44%', padding: 3, borderRadius: radius.sm, backgroundColor: 'rgba(248,246,241,0.14)' },
  indicatorCompact: { left: '29%', top: '43%' },
  meldArea: { position: 'absolute', left: '24%', right: '24%', top: '25%', alignItems: 'center', gap: 4 },
  meldAreaCompact: { left: '27%', right: '27%', top: '27%' },
  meld: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: radius.sm, backgroundColor: 'rgba(10,16,40,0.32)' },
  meldTiles: { flexDirection: 'row', gap: 2 },
  gift: { position: 'absolute', width: 46, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.inkRaised, borderColor: palette.lilac, borderWidth: 1, overflow: 'hidden' },
  giftImage: { width: 42, height: 42 },
  winnerGlow: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(41,225,214,0.08)', borderWidth: 2, borderColor: 'rgba(184,155,255,0.7)', borderRadius: radius.lg },
  winnerParticles: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  winnerParticle: { position: 'absolute', width: 5, height: 5, borderRadius: radius.pill, opacity: 0.8 },
  winnerCard: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: 'rgba(10,16,40,0.82)', borderWidth: 1, borderColor: palette.aqua },
  winnerLabel: { color: palette.pearl, fontSize: 16, fontWeight: '900' },
});
