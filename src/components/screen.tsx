import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/use-app-theme';
import { space } from '../theme/tokens';

interface ScreenProps extends PropsWithChildren {
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}

export function Screen({ children, title, eyebrow, right, scroll = true, contentStyle }: ScreenProps) {
  const { colors } = useAppTheme();
  const content = (
    <View style={[styles.content, contentStyle]}>
      {(title !== undefined || eyebrow !== undefined || right !== undefined) && (
        <View style={styles.header}>
          <View style={styles.heading}>
            {eyebrow !== undefined && <Text maxFontSizeMultiplier={1.5} style={[styles.eyebrow, { color: colors.muted }]}>{eyebrow}</Text>}
            {title !== undefined && <Text maxFontSizeMultiplier={1.5} style={[styles.title, { color: colors.text }]}>{title}</Text>}
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: space.lg, paddingBottom: 120, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  heading: { flex: 1, gap: space.xs },
  eyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8 },
});
