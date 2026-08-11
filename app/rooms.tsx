import { router } from 'expo-router';
import { UsersRound } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../src/components/glass-card';
import { LumaButton } from '../src/components/luma-button';
import { Screen } from '../src/components/screen';
import { useAppTheme } from '../src/hooks/use-app-theme';
import { palette, space } from '../src/theme/tokens';

export default function RoomsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Screen title={t('room.title')}>
      <GlassCard style={styles.empty}>
        <View style={styles.icon}><UsersRound size={34} color={palette.aquaDeep} /></View>
        <Text style={[styles.title, { color: colors.text }]}>{t('room.empty')}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t('room.emptyBody')}</Text>
        <LumaButton label={t('room.create')} onPress={() => router.push('/create-room')} />
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', marginTop: 64 },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(41,225,214,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: space.md },
});
