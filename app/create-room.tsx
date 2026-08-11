import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../src/components/glass-card';
import { LumaButton } from '../src/components/luma-button';
import { Screen } from '../src/components/screen';
import { useAppTheme } from '../src/hooks/use-app-theme';
import { palette, radius, space } from '../src/theme/tokens';

export default function CreateRoomScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [variant, setVariant] = useState<'classic' | '101'>('classic');
  return (
    <Screen title={t('create.title')} eyebrow={t('common.mock')}>
      <Text style={[styles.label, { color: colors.muted }]}>{t('create.variant')}</Text>
      <View style={styles.segment}>
        {(['classic', '101'] as const).map((item) => (
          <Pressable key={item} onPress={() => setVariant(item)} style={[styles.option, { backgroundColor: variant === item ? palette.aqua : colors.surface }]}>
            <Text style={{ color: variant === item ? palette.ink : colors.text, fontWeight: '800' }}>{item === 'classic' ? t('create.classic') : t('create.101')}</Text>
          </Pressable>
        ))}
      </View>
      <GlassCard>
        <Text style={[styles.title, { color: colors.text }]}>{t('create.privacy')}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t('create.casual')}</Text>
      </GlassCard>
      <GlassCard style={{ borderColor: 'rgba(255,142,131,0.35)' }}>
        <Text style={[styles.body, { color: palette.coral }]}>{t('create.chipDisabled')}</Text>
      </GlassCard>
      <LumaButton label={t('create.cta')} onPress={() => router.replace({ pathname: '/game/[roomId]', params: { roomId: 'demo-room', variant, seed: String(Date.now() % 1_000_000) } })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  segment: { flexDirection: 'row', gap: space.sm },
  option: { flex: 1, minHeight: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
});
