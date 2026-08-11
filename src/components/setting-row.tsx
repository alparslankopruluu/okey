import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppTheme } from '../hooks/use-app-theme';
import { palette, radius, space } from '../theme/tokens';

export function SettingRow({ title, body, value, onToggle, onPress, action }: { title: string; body?: string; value?: boolean; onToggle?: () => void; onPress?: () => void; action?: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole={onToggle === undefined ? onPress === undefined ? undefined : 'button' : 'switch'}
      accessibilityState={value === undefined ? undefined : { checked: value }}
      onPress={onToggle ?? onPress}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {body !== undefined && <Text style={[styles.body, { color: colors.muted }]}>{body}</Text>}
      </View>
      {onToggle !== undefined && value !== undefined ? (
        <Switch value={value} onValueChange={onToggle} trackColor={{ true: palette.aquaDeep }} />
      ) : action}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 68, borderWidth: 1, borderRadius: radius.md, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md },
  copy: { flex: 1, gap: space.xxs },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18 },
});
