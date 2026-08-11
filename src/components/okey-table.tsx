import { Canvas, Circle, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import type { GameState } from '@luma/game-core';
import { StyleSheet, Text, View } from 'react-native';
import { AvatarMedallion } from './avatar-medallion';
import { palette, radius } from '../theme/tokens';

interface OkeyTableProps {
  readonly state: GameState;
  readonly width: number;
  readonly height: number;
  readonly lowPerformance: boolean;
  readonly playerNames: readonly string[];
  readonly wallLabel: string;
}

export function OkeyTable({ state, width, height, lowPerformance, playerNames, wallLabel }: OkeyTableProps) {
  const positions = [
    { left: width / 2 - 36, bottom: 8 },
    { left: 8, top: height / 2 - 34 },
    { left: width / 2 - 36, top: 8 },
    { right: 8, top: height / 2 - 34 },
  ] as const;
  return (
    <View style={[styles.root, { width, height }]}>
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
      <View style={styles.centerPile}>
        <Text style={styles.wallCount}>{state.wall.length}</Text>
        <Text style={styles.wallLabel}>{wallLabel}</Text>
      </View>
      {state.players.map((player, index) => (
        <View key={player.id} style={[styles.seat, positions[index]]}>
          <AvatarMedallion index={index} size={index === 0 ? 66 : 56} active={state.turnIndex === index} />
          <Text style={[styles.name, state.turnIndex === index && styles.activeName]}>{playerNames[index] ?? player.id}</Text>
          <Text style={styles.count}>{player.rack.length}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'center' },
  seat: { position: 'absolute', alignItems: 'center' },
  name: { color: palette.pearl, fontSize: 11, fontWeight: '700', marginTop: 2 },
  activeName: { color: palette.aqua },
  count: { color: palette.mutedDark, fontSize: 10, fontWeight: '700' },
  centerPile: {
    position: 'absolute',
    left: '42%',
    top: '40%',
    width: '16%',
    minWidth: 54,
    aspectRatio: 1.25,
    borderRadius: radius.sm,
    backgroundColor: '#EFE7D8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.black,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  wallCount: { color: palette.ink, fontSize: 17, fontWeight: '900' },
  wallLabel: { color: palette.mutedLight, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
});
