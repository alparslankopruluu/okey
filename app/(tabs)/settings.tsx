import { router } from 'expo-router';
import { ChevronRight, Music2, SkipForward } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LumaButton } from '../../src/components/luma-button';
import { Screen } from '../../src/components/screen';
import { SettingRow } from '../../src/components/setting-row';
import { useAppTheme } from '../../src/hooks/use-app-theme';
import { useAppStore } from '../../src/stores/app-store';
import { palette, space } from '../../src/theme/tokens';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const store = useAppStore();
  return (
    <Screen title={t('settings.title')}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t('settings.music')}</Text>
        <SettingRow title={t('settings.music')} body={t('settings.musicBody')} action={<Music2 color={store.musicPlaying ? palette.aquaDeep : colors.muted} />} />
        <View style={styles.row}>
          <LumaButton label={store.musicPlaying ? t('settings.pause') : t('settings.play')} onPress={store.toggleMusic} style={styles.flex} />
          <LumaButton label={t('settings.nextTrack')} icon={<SkipForward size={18} color={colors.text} />} variant="secondary" onPress={store.nextMusicTrack} style={styles.flex} />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t('settings.theme')}</Text>
        <SettingRow title={t('settings.theme')} body={store.appearance === 'dark' ? 'Midnight' : 'Pearl'} value={store.appearance === 'dark'} onToggle={store.toggleAppearance} />
        <SettingRow title={t('settings.motion')} value={store.reducedMotion} onToggle={store.toggleReducedMotion} />
        <SettingRow title={t('settings.performance')} value={store.lowPerformance} onToggle={store.toggleLowPerformance} />
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t('settings.language')}</Text>
        <View style={styles.row}>
          <LumaButton label="Türkçe" variant={store.language === 'tr' ? 'primary' : 'secondary'} onPress={() => store.setLanguage('tr')} style={styles.flex} />
          <LumaButton label="English" variant={store.language === 'en' ? 'primary' : 'secondary'} onPress={() => store.setLanguage('en')} style={styles.flex} />
        </View>
      </View>
      <SettingRow title={t('settings.safety')} onPress={() => { router.push('/safety'); }} action={<ChevronRight color={colors.muted} />} />
      <SettingRow title={t('settings.account')} body={t('settings.accountBody')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space.sm },
  sectionTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1 },
  row: { flexDirection: 'row', gap: space.sm },
});
