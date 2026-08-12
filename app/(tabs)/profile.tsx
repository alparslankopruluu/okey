import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AvatarMedallion } from '../../src/components/avatar-medallion';
import { GlassCard } from '../../src/components/glass-card';
import { Screen } from '../../src/components/screen';
import { useAppTheme } from '../../src/hooks/use-app-theme';
import { useAppStore } from '../../src/stores/app-store';
import { palette, space } from '../../src/theme/tokens';
import { InMemoryFriendshipService, type SocialProfile } from '../../src/services/mock-social';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const avatarIndex = useAppStore((state) => state.avatarIndex);
  const selectAvatar = useAppStore((state) => state.selectAvatar);
  const social = useMemo(() => {
    const service = new InMemoryFriendshipService();
    service.register({ userId: 'p0', username: 'luma_guest', displayName: t('profile.guest'), now: 0 });
    service.register({ userId: 'ada', username: 'ada_luma', displayName: 'Ada', now: 0 });
    service.register({ userId: 'mert', username: 'mert_101', displayName: 'Mert', now: 0 });
    service.register({ userId: 'lina', username: 'lina_okey', displayName: 'Lina', now: 0 });
    return service;
  }, [t]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly SocialProfile[]>([]);
  const [pending, setPending] = useState<readonly string[]>([]);
  const search = (value: string) => {
    setQuery(value);
    if (value.length === 0) setResults([]);
    else {
      try { setResults(social.search('p0', value)); } catch { setResults([]); }
    }
  };
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
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('friends.title')}</Text>
      <GlassCard>
        <TextInput accessibilityLabel={t('friends.search')} value={query} onChangeText={search} placeholder={t('friends.search')} placeholderTextColor={colors.muted} autoCapitalize="none" style={[styles.search, { color: colors.text, borderColor: colors.border }]} />
        {results.map((profile) => (
          <View key={profile.userId} style={styles.friendRow}>
            <View style={styles.friendCopy}><Text style={[styles.friendName, { color: colors.text }]}>{profile.displayName}</Text><Text style={[styles.handle, { color: colors.muted }]}>@{profile.username}</Text></View>
            <Pressable accessibilityRole="button" disabled={pending.includes(profile.userId)} onPress={() => {
              try { social.sendRequest('p0', profile.userId, Date.now()); setPending((items) => [...items, profile.userId]); } catch { /* Mock policy owns the error. */ }
            }} style={[styles.addButton, { opacity: pending.includes(profile.userId) ? 0.5 : 1 }]}><Text style={styles.addLabel}>{pending.includes(profile.userId) ? t('friends.pending') : t('friends.add')}</Text></Pressable>
          </View>
        ))}
        {results.length === 0 && <Text style={[styles.caption, { color: colors.muted }]}>{t('friends.requestsEmpty')}</Text>}
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
  search: { minHeight: 46, borderWidth: 1, borderRadius: 23, paddingHorizontal: space.md },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  friendCopy: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '800' },
  handle: { fontSize: 12, marginTop: 2 },
  addButton: { minHeight: 36, borderRadius: 18, backgroundColor: palette.aqua, justifyContent: 'center', paddingHorizontal: space.md },
  addLabel: { color: palette.ink, fontSize: 12, fontWeight: '900' },
});
