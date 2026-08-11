import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AvatarMedallion } from '../../src/components/avatar-medallion';
import { GlassCard } from '../../src/components/glass-card';
import { Screen } from '../../src/components/screen';
import { useAppTheme } from '../../src/hooks/use-app-theme';
import { useAppStore } from '../../src/stores/app-store';
import { palette, space } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const avatarIndex = useAppStore((state) => state.avatarIndex);
  const selectAvatar = useAppStore((state) => state.selectAvatar);
  return (
    <Screen title={t('profile.title')}>
      <View style={styles.hero}>
        <AvatarMedallion index={avatarIndex} size={132} active />
        <Text style={[styles.name, { color: colors.text }]}>{t('profile.guest')}</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>{t('profile.stats')}</Text>
      </View>
      <GlassCard>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={[styles.statNumber, { color: colors.text }]}>0</Text><Text style={[styles.caption, { color: colors.muted }]}>{t('profile.rounds')}</Text></View>
          <View style={styles.divider} />
          <View style={styles.stat}><Text style={[styles.statNumber, { color: colors.text }]}>0</Text><Text style={[styles.caption, { color: colors.muted }]}>{t('profile.wins')}</Text></View>
        </View>
      </GlassCard>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.choose')}</Text>
      <View style={styles.grid}>
        {Array.from({ length: 12 }, (_, index) => (
          <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected: index === avatarIndex }} onPress={() => { selectAvatar(index); }} style={[styles.avatarCell, index === avatarIndex && { backgroundColor: 'rgba(41,225,214,0.14)', borderColor: palette.aqua }]}>
            <AvatarMedallion index={index} size={68} active={index === avatarIndex} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.xs },
  name: { fontSize: 23, fontWeight: '900', marginTop: space.sm },
  caption: { fontSize: 13 },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: space.xxs, flex: 1 },
  statNumber: { fontSize: 25, fontWeight: '900' },
  divider: { width: 1, backgroundColor: 'rgba(127,137,169,0.25)' },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between' },
  avatarCell: { width: '30%', alignItems: 'center', paddingVertical: space.sm, borderWidth: 1, borderColor: 'transparent', borderRadius: 20 },
});
