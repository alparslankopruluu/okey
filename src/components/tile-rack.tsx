import type { Tile } from '@luma/game-core';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { TileCard } from './tile-card';
import { images } from '../assets';
import { palette, radius, space } from '../theme/tokens';
import type { RackDropDirection } from '../services/table-interaction';

interface TileRackProps {
  tiles: Tile[];
  selectedId: string | undefined;
  width: number;
  accessibilityLabel: string;
  reducedMotion: boolean;
  theme?: 'luma' | 'kahvehane';
  onSelect(tileId: string): void;
  onMove(tileId: string, delta: number): void;
  onDiscard?(tileId: string): void;
  discardEnabled?: boolean;
  discardDirection?: RackDropDirection;
  interactionEnabled?: boolean;
  onDragActive?: ((active: boolean) => void) | undefined;
}

const TILE_GAP = 3;
const MIN_TILE_WIDTH = 34;
const MAX_TILE_WIDTH = 47;

export function TileRack({
  tiles,
  selectedId,
  width,
  accessibilityLabel,
  reducedMotion,
  theme = 'luma',
  onSelect,
  onMove,
  onDiscard,
  discardEnabled = false,
  discardDirection = 'up',
  interactionEnabled = true,
  onDragActive,
}: TileRackProps) {
  const [tileGestureActive, setTileGestureActive] = React.useState(false);
  const columns = Math.max(1, Math.ceil(tiles.length / 2));
  const availableWidth = width - space.sm * 2;
  const fittedWidth = (availableWidth - TILE_GAP * (columns - 1)) / columns;
  const tileWidth = Math.max(MIN_TILE_WIDTH, Math.min(MAX_TILE_WIDTH, fittedWidth));
  const tileHeight = Math.round(Math.max(56, Math.min(72, tileWidth * 1.55)));
  const contentWidth = Math.max(width, tileWidth * columns + TILE_GAP * (columns - 1) + space.sm * 2);
  const rackHeight = space.md + (tileHeight + 9) * 2 + space.xs + space.sm;
  const rows = [tiles.slice(0, columns), tiles.slice(columns)];

  return (
    <ScrollView
      horizontal
      directionalLockEnabled
      accessibilityLabel={accessibilityLabel}
      bounces={false}
      scrollEnabled={contentWidth > width + 1 && !tileGestureActive}
      contentContainerStyle={styles.scrollContent}
      showsHorizontalScrollIndicator={false}
      style={{ width, height: rackHeight, flexGrow: 0 }}
    >
      <LinearGradient
        colors={theme === 'kahvehane' ? ['#6B351B', '#2C150D'] : [palette.rackTop, palette.rackBottom]}
        end={{ x: 0.78, y: 1 }}
        start={{ x: 0.18, y: 0 }}
        style={[styles.frame, { width: contentWidth, height: rackHeight }]}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image resizeMode="stretch" source={theme === 'kahvehane' ? images.themes.kahvehaneRack : images.rack} style={[styles.rackAsset, theme === 'kahvehane' && styles.kahvehaneRackAsset]} />
        </View>
        <View pointerEvents="none" style={styles.backGlow} />
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.shelf}>
            <View style={styles.tileRow}>
              {row.map((tile) => (
                <TileCard
                  key={tile.id}
                  tile={tile}
                  selected={selectedId === tile.id}
                  width={tileWidth}
                  reducedMotion={reducedMotion}
                  theme={theme}
                  rowStride={columns}
                  rowStep={tileHeight + 9}
                  onPress={() => onSelect(tile.id)}
                  onMove={(delta) => onMove(tile.id, delta)}
                  onDiscard={onDiscard === undefined ? undefined : () => onDiscard(tile.id)}
                  discardEnabled={discardEnabled}
                  discardDirection={discardDirection}
                  interactionEnabled={interactionEnabled}
                  onDragActive={(active) => {
                    setTileGestureActive(active);
                    onDragActive?.(active);
                  }}
                />
              ))}
            </View>
            <View pointerEvents="none" style={styles.rail}>
              <View style={styles.railHighlight} />
            </View>
          </View>
        ))}
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { minWidth: '100%' },
  frame: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.rackHighlight,
    paddingHorizontal: space.sm,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.xs,
    overflow: 'hidden',
    shadowColor: palette.black,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  backGlow: {
    position: 'absolute',
    top: -34,
    left: '18%',
    width: '64%',
    height: 86,
    borderRadius: radius.pill,
    backgroundColor: palette.rackHighlight,
    opacity: 0.46,
  },
  rackAsset: {
    width: '100%',
    height: '100%',
    opacity: 0.72,
  },
  kahvehaneRackAsset: { opacity: 0.96 },
  shelf: { justifyContent: 'flex-end' },
  tileRow: { minHeight: 56, flexDirection: 'row', alignItems: 'flex-end', gap: TILE_GAP, zIndex: 2 },
  rail: {
    height: 11,
    marginTop: -2,
    marginHorizontal: -space.xs,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    backgroundColor: palette.rackRail,
    shadowColor: palette.black,
    shadowOpacity: 0.36,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 3,
  },
  railHighlight: {
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: palette.rackHighlight,
  },
});
