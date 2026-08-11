import { Ban, Flag, MicOff } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../src/components/glass-card';
import { LumaButton } from '../src/components/luma-button';
import { Screen } from '../src/components/screen';
import { useAppTheme } from '../src/hooks/use-app-theme';
import { palette, space } from '../src/theme/tokens';

export default function SafetyScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Screen title={t('safety.title')}>
      <Text style={[styles.body, { color: colors.muted }]}>{t('safety.body')}</Text>
      <GlassCard>
        <View style={styles.row}><MicOff color={palette.aquaDeep} /><Text style={[styles.title, { color: colors.text }]}>{t('safety.mute')}</Text></View>
        <LumaButton label={t('common.mock')} variant="secondary" onPress={() => undefined} />
      </GlassCard>
      <GlassCard>
        <View style={styles.row}><Ban color={palette.lilac} /><Text style={[styles.title, { color: colors.text }]}>{t('safety.block')}</Text></View>
        <Text style={[styles.body, { color: colors.muted }]}>—</Text>
      </GlassCard>
      <GlassCard>
        <View style={styles.row}><Flag color={palette.coral} /><Text style={[styles.title, { color: colors.text }]}>{t('safety.report')}</Text></View>
        <LumaButton label={t('common.mock')} variant="danger" onPress={() => undefined} />
      </GlassCard>
      <Text style={[styles.notice, { color: colors.muted }]}>{t('safety.noRecording')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 15, lineHeight: 22 },
  notice: { textAlign: 'center', fontSize: 13 },
});
