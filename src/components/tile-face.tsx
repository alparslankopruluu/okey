import type { Tile, TileColor } from '@luma/game-core';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { palette, radius } from '../theme/tokens';

const inkByColor: Record<TileColor, string> = {
  red: '#E85A67',
  blue: '#3387E8',
  black: '#20263A',
  yellow: '#D49B22',
};

interface TileFaceProps {
  readonly tile: Tile;
  readonly size?: number;
  readonly highlighted?: boolean | undefined;
  readonly onPress?: (() => void) | undefined;
  readonly accessibilityLabel?: string | undefined;
}

/** A small, non-draggable tile used for table state: indicators, discards, and melds. */
export function TileFace({ tile, size = 34, highlighted = false, onPress, accessibilityLabel }: TileFaceProps) {
  const { t } = useTranslation();
  const color = tile.kind === 'false_joker' ? palette.lilac : inkByColor[tile.color ?? 'black'];
  const label = accessibilityLabel
    ?? (tile.kind === 'false_joker'
      ? t('a11y.falseJoker')
      : t('a11y.tile', { color: t(`color.${tile.color ?? 'black'}`), number: tile.number }));
  const height = Math.round(size * 1.38);
  const contents = (
    <>
      <View style={[styles.glyph, { backgroundColor: color }]} />
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.number, { color, fontSize: Math.max(14, size * 0.54) }]}>
        {tile.kind === 'false_joker' ? '✦' : tile.number}
      </Text>
      <View style={[styles.underline, { backgroundColor: color }]} />
    </>
  );

  const faceStyle = [styles.face, { width: size, height, borderColor: highlighted ? palette.aqua : palette.tileBorder }];
  if (onPress === undefined) {
    return <View accessible accessibilityLabel={label} style={faceStyle}>{contents}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={faceStyle}
    >
      {contents}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
    backgroundColor: palette.tileIvory,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: palette.black,
    shadowOpacity: 0.16,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  glyph: { width: 5, height: 5, borderRadius: 3 },
  number: { width: '100%', textAlign: 'center', fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -0.6 },
  underline: { width: 13, height: 2.5, borderRadius: 2 },
});
