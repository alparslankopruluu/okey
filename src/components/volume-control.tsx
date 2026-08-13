import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { palette, radius, space } from '../theme/tokens';

interface VolumeControlProps {
  readonly label: string;
  readonly value: number;
  readonly disabled?: boolean;
  readonly decreaseLabel: string;
  readonly increaseLabel: string;
  readonly onChange: (value: number) => void;
}

const STEP = 0.1;

export function VolumeControl({ label, value, disabled = false, decreaseLabel, increaseLabel, onChange }: VolumeControlProps) {
  const { colors } = useAppTheme();
  const percent = Math.round(value * 100);
  const change = (delta: number) => onChange(Math.max(0, Math.min(1, Math.round((value + delta) * 10) / 10)));
  return (
    <View accessibilityLabel={`${label} ${String(percent)}%`} style={[styles.root, { borderColor: colors.border, opacity: disabled ? 0.46 : 1 }]}>
      <View style={styles.copy}>
        <Text maxFontSizeMultiplier={1.5} style={[styles.label, { color: colors.text }]}>{label}</Text>
        <View accessibilityElementsHidden style={[styles.track, { backgroundColor: colors.elevated }]}>
          <View style={[styles.fill, { flex: percent }]} />
          <View style={{ flex: 100 - percent }} />
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={decreaseLabel} disabled={disabled || value <= 0} onPress={() => change(-STEP)} style={[styles.button, { backgroundColor: colors.elevated }]}>
        <Minus size={18} color={colors.text} />
      </Pressable>
      <Text allowFontScaling={false} style={[styles.percent, { color: colors.muted }]}>{percent}%</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={increaseLabel} disabled={disabled || value >= 1} onPress={() => change(STEP)} style={[styles.button, { backgroundColor: colors.elevated }]}>
        <Plus size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 64, borderWidth: 1, borderRadius: radius.md, padding: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  copy: { flex: 1, gap: space.xs },
  label: { fontSize: 14, fontWeight: '800' },
  track: { height: 5, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.aquaDeep },
  button: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  percent: { width: 38, fontSize: 12, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
});
