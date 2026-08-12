import { Canvas, Circle, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import type { GameState, TableMeld, Tile } from '@luma/game-core';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AvatarMedallion } from './avatar-medallion';
import { TileFace } from './tile-face';
import { palette, radius } from '../theme/tokens';

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
  readonly label: string;
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
      {meld.tiles.map((tile) => <TileFace key={tile.id} tile={tile} size={compact ? 20 : 24} />)}
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
      <Text numberOfLines={1} style={styles.giftLabel}>{event.label}</Text>
    </Animated.View>
  );
}

function WinnerGlow({ winnerId, reducedMotion }: { winnerId: string; reducedMotion: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: reducedMotion ? 140 : 320, easing: Easing.out(Easing.cubic) });
  }, [progress, reducedMotion, winnerId]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: reducedMotion ? progress.value * 0.72 : progress.value }));
  return <Animated.View pointerEvents="none" accessibilityElementsHidden style={[styles.winnerGlow, animatedStyle]} />;
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
  const isWinner = state.phase === 'round_finished' && state.winnerId !== undefined;

  return (
    <View accessibilityLabel={state.variant === 'classic' ? t('game.classic') : t('game.101')} style={[styles.root, { width, height }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <RoundedRect x={2} y={2} width={width - 4} height={height - 4} r={Math.min(radius.lg * 2, height / 3)}>
          <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#263B68', '#121B3B', '#29325D']} />
        </RoundedRect>
        <RoundedRect x={18} y={18} width={width - 36} height={height - 36} r={Math.min(radius.lg * 1.7, height / 3)} color="#172B50" />
        <Circle cx={width / 2} cy={height / 2} r={Math.min(width, height) * 0.14} color="rgba(41,225,214,0.08)" />
        {!lowPerformance && (
          <>
            <Circle cx={width * 0.2} cy={height * 0.28} r={3} color={palette.lilac} />
            <Circle cx={width * 0.78} cy={height * 0.22} r={2} color={palette.aqua} />
            <Circle cx={width * 0.7} cy={height * 0.72} r={2.5} color={palette.coral} />
          </>
        )}
      </Canvas>
      <View style={styles.centerPile} accessible accessibilityLabel={wallLabel}>
        <Text style={styles.wallCount}>{state.wall.length}</Text>
        <Text style={styles.wallLabel}>{wallLabel}</Text>
      </View>
      <View style={[styles.indicator, compact && styles.indicatorCompact]} accessible accessibilityLabel={t('a11y.tile', { color: t(`color.${(indicatorTile ?? state.indicatorTile).color ?? 'black'}`), number: (indicatorTile ?? state.indicatorTile).number })}>
        <TileFace tile={indicatorTile ?? state.indicatorTile} size={compact ? 20 : 25} />
      </View>
      {state.tableMelds.length > 0 && (
        <View style={[styles.meldArea, compact && styles.meldAreaCompact]}>
          {state.tableMelds.map((meld) => <MeldGroup key={meld.id} meld={meld} compact={compact} reducedMotion={reducedMotion} />)}
        </View>
      )}
      {state.players.map((player, index) => (
        <View key={player.id} style={[styles.seat, positions[index]]}>
          <AvatarMedallion index={index} size={index === 0 ? seatSize + 8 : seatSize} active={state.turnIndex === index} />
          <Text numberOfLines={1} style={[styles.name, state.turnIndex === index && styles.activeName]}>{playerNames[index] ?? player.id}</Text>
          <Text style={styles.count}>{player.rack.length}</Text>
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
      {isWinner && <WinnerGlow winnerId={state.winnerId ?? ''} reducedMotion={reducedMotion || lowPerformance} />}
      {!lowPerformance && giftEvent !== undefined && <GiftFlight event={giftEvent} width={width} height={height} reducedMotion={reducedMotion} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'center', overflow: 'hidden' },
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
  wallCount: { color: palette.ink, fontSize: 17, fontWeight: '900' },
  wallLabel: { color: palette.mutedLight, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  indicator: { position: 'absolute', left: '31%', top: '44%', padding: 3, borderRadius: radius.sm, backgroundColor: 'rgba(248,246,241,0.14)' },
  indicatorCompact: { left: '29%', top: '43%' },
  meldArea: { position: 'absolute', left: '24%', right: '24%', top: '25%', alignItems: 'center', gap: 4 },
  meldAreaCompact: { left: '27%', right: '27%', top: '27%' },
  meld: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: radius.sm, backgroundColor: 'rgba(10,16,40,0.32)' },
  gift: { position: 'absolute', width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.inkRaised, borderColor: palette.lilac, borderWidth: 1 },
  giftLabel: { color: palette.pearl, fontSize: 18 },
  winnerGlow: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(41,225,214,0.08)', borderWidth: 2, borderColor: 'rgba(184,155,255,0.7)', borderRadius: radius.lg },
});
