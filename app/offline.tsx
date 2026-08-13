import { router } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../src/components/glass-card';
import { LumaButton } from '../src/components/luma-button';
import { Screen } from '../src/components/screen';
import { useAppTheme } from '../src/hooks/use-app-theme';
import { palette, radius, space } from '../src/theme/tokens';

export default function OfflineScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [variant, setVariant] = useState<'classic' | '101'>('classic');
  const [seed, setSeed] = useState(20260811);
  const [roundCount, setRoundCount] = useState<1 | 2 | 3 | 4>(1);
  const [progressive, setProgressive] = useState(false);
  const [assisted, setAssisted] = useState(true);
  return (
    <Screen title={t('offline.title')} eyebrow={t('common.mock')}>
      <Text style={[styles.body, { color: colors.muted }]}>{t('offline.body')}</Text>
      <View style={styles.segment}>
        {(['classic', '101'] as const).map((item) => (
          <Pressable key={item} onPress={() => setVariant(item)} style={[styles.segmentItem, { backgroundColor: item === variant ? palette.aqua : colors.surface }]}>
            <Text style={[styles.segmentLabel, { color: item === variant ? palette.ink : colors.text }]}>{item === 'classic' ? t('create.classic') : t('create.101')}</Text>
          </Pressable>
        ))}
      </View>
      <GlassCard>
        <Text style={[styles.label, { color: colors.muted }]}>{t('offline.seed')}</Text>
        <View style={styles.seedRow}>
          <Pressable accessibilityRole="button" onPress={() => setSeed((value) => Math.max(1, value - 1))} style={[styles.round, { backgroundColor: colors.elevated }]}><Minus color={colors.text} /></Pressable>
          <Text style={[styles.seed, { color: colors.text }]}>{seed}</Text>
          <Pressable accessibilityRole="button" onPress={() => setSeed((value) => value + 1)} style={[styles.round, { backgroundColor: colors.elevated }]}><Plus color={colors.text} /></Pressable>
        </View>
      </GlassCard>
      <GlassCard>
        <Text style={[styles.label, { color: colors.muted }]}>{t('offline.rounds')}</Text>
        <View style={styles.segment}>
          {([1, 2, 3, 4] as const).map((count) => <Pressable key={count} accessibilityRole="button" accessibilityState={{ selected: roundCount === count }} onPress={() => setRoundCount(count)} style={[styles.roundChoice, { backgroundColor: roundCount === count ? palette.aqua : colors.elevated }]}><Text style={{ color: roundCount === count ? palette.ink : colors.text, fontWeight: '900' }}>{count}</Text></Pressable>)}
        </View>
        {variant === '101' && <View style={styles.optionRow}>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: progressive }} onPress={() => setProgressive((value) => !value)} style={[styles.option, { borderColor: colors.border }]}><Text style={{ color: colors.text, fontWeight: '800' }}>{t(progressive ? 'offline.progressive' : 'offline.fixed')}</Text></Pressable>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: assisted }} onPress={() => setAssisted((value) => !value)} style={[styles.option, { borderColor: colors.border }]}><Text style={{ color: colors.text, fontWeight: '800' }}>{t(assisted ? 'offline.assisted' : 'offline.unassisted')}</Text></Pressable>
        </View>}
      </GlassCard>
      <LumaButton label={t('offline.start')} onPress={() => router.push({ pathname: '/game/[roomId]', params: { roomId: 'offline', variant, seed: String(seed), roundCount: String(roundCount), openingThresholdMode: progressive ? 'progressive' : 'fixed', assistanceMode: assisted ? 'assisted' : 'unassisted' } })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 23 },
  segment: { flexDirection: 'row', gap: space.xs },
  segmentItem: { flex: 1, minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  segmentLabel: { fontWeight: '800', textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  seedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  seed: { fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'] },
  roundChoice: { flex: 1, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  optionRow: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  option: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs },
});
