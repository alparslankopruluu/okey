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

const LOCAL_USER_ID = 'p0';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const avatarIndex = useAppStore((state) => state.avatarIndex);
  const selectAvatar = useAppStore((state) => state.selectAvatar);
  const blockedUserIds = useAppStore((state) => state.blockedUserIds);
  const blockUser = useAppStore((state) => state.blockUser);
  const unblockUser = useAppStore((state) => state.unblockUser);
  const social = useMemo(() => {
    const service = new InMemoryFriendshipService();
    service.register({ userId: LOCAL_USER_ID, username: 'luma_guest', displayName: t('profile.guest'), now: 0 });
    service.register({ userId: 'p1', username: 'ada_luma', displayName: 'Ada', now: 0 });
    service.register({ userId: 'p2', username: 'mert_101', displayName: 'Mert', now: 0 });
    service.register({ userId: 'p3', username: 'lina_okey', displayName: 'Lina', now: 0 });
    service.sendRequest('p1', LOCAL_USER_ID, 1);
    service.sendRequest(LOCAL_USER_ID, 'p2', 2);
    service.respondToRequest('p2', LOCAL_USER_ID, true, 3);
    for (const blockedUserId of blockedUserIds) {
      try { service.block(LOCAL_USER_ID, blockedUserId); } catch { /* Persisted unknown IDs stay hidden by the store list. */ }
    }
    return service;
  }, [blockedUserIds, t]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly SocialProfile[]>([]);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const pendingOutgoing = results.filter((profile) => {
    try { return !social.areFriends(LOCAL_USER_ID, profile.userId) && social.incomingRequests(profile.userId).some((request) => request.requesterId === LOCAL_USER_ID); } catch { return false; }
  }).map((profile) => profile.userId);
  const incoming = social.incomingRequests(LOCAL_USER_ID);
  const friends = social.friendsFor(LOCAL_USER_ID);
  const search = (value: string) => {
    setQuery(value);
    if (value.length === 0) setResults([]);
    else {
      try { setResults(social.search(LOCAL_USER_ID, value)); } catch { setResults([]); }
    }
  };
  const refresh = () => {
    setRevision((value) => value + 1);
    if (query.length > 0) search(query);
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
            <Pressable accessibilityRole="button" disabled={pendingOutgoing.includes(profile.userId) || social.areFriends(LOCAL_USER_ID, profile.userId)} onPress={() => {
              try { social.sendRequest(LOCAL_USER_ID, profile.userId, Date.now()); setNotice(t('friends.requestSent')); refresh(); } catch { setNotice(t('friends.actionUnavailable')); }
            }} style={[styles.addButton, { opacity: pendingOutgoing.includes(profile.userId) || social.areFriends(LOCAL_USER_ID, profile.userId) ? 0.5 : 1 }]}><Text style={styles.addLabel}>{social.areFriends(LOCAL_USER_ID, profile.userId) ? t('friends.friend') : pendingOutgoing.includes(profile.userId) ? t('friends.pending') : t('friends.add')}</Text></Pressable>
          </View>
        ))}
        {results.length === 0 && <Text style={[styles.caption, { color: colors.muted }]}>{t('friends.searchHint')}</Text>}
      </GlassCard>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('friends.requests')}</Text>
      <GlassCard>
        {incoming.map((request) => {
          const profile = social.profile(request.requesterId);
          return <View key={request.id} style={styles.friendRow}>
            <AvatarMedallion index={1} size={56} />
            <View style={styles.friendCopy}><Text style={[styles.friendName, { color: colors.text }]}>{profile.displayName}</Text><Text style={[styles.handle, { color: colors.muted }]}>@{profile.username}</Text></View>
            <View style={styles.compactActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('friends.accept')} onPress={() => { social.respondToRequest(LOCAL_USER_ID, profile.userId, true, Date.now()); setNotice(t('friends.accepted', { name: profile.displayName })); refresh(); }} style={styles.addButton}><Text style={styles.addLabel}>{t('friends.accept')}</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('friends.reject')} onPress={() => { social.respondToRequest(LOCAL_USER_ID, profile.userId, false, Date.now()); setNotice(t('friends.rejected')); refresh(); }} style={[styles.smallButton, { borderColor: colors.border }]}><Text style={[styles.smallLabel, { color: colors.text }]}>{t('friends.reject')}</Text></Pressable>
            </View>
          </View>;
        })}
        {incoming.length === 0 && <Text style={[styles.caption, { color: colors.muted }]}>{t('friends.requestsEmpty')}</Text>}
      </GlassCard>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('friends.list')}</Text>
      <GlassCard>
        {friends.map((profile, index) => (
          <View key={profile.userId} style={styles.friendColumn}>
            <View style={styles.friendRow}>
              <AvatarMedallion index={index + 2} size={56} />
              <View style={styles.friendCopy}><Text style={[styles.friendName, { color: colors.text }]}>{profile.displayName}</Text><Text style={[styles.handle, { color: colors.muted }]}>@{profile.username}</Text></View>
            </View>
            <View style={styles.friendActions}>
              <Pressable accessibilityRole="button" onPress={() => { try { social.inviteToRoom({ senderId: LOCAL_USER_ID, recipientId: profile.userId, roomId: 'private_luma_room', now: Date.now(), expiresAt: Date.now() + 15 * 60 * 1000 }); setNotice(t('friends.invited', { name: profile.displayName })); } catch { setNotice(t('friends.actionUnavailable')); } }} style={styles.addButton}><Text style={styles.addLabel}>{t('friends.invite')}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { social.removeFriend(LOCAL_USER_ID, profile.userId); setNotice(t('friends.removed')); refresh(); }} style={[styles.smallButton, { borderColor: colors.border }]}><Text style={[styles.smallLabel, { color: colors.text }]}>{t('friends.remove')}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { social.block(LOCAL_USER_ID, profile.userId); blockUser(profile.userId); setNotice(t('friends.blocked')); refresh(); }} style={[styles.smallButton, { borderColor: palette.danger }]}><Text style={[styles.smallLabel, { color: palette.danger }]}>{t('friends.block')}</Text></Pressable>
            </View>
          </View>
        ))}
        {friends.length === 0 && <Text style={[styles.caption, { color: colors.muted }]}>{t('friends.empty')}</Text>}
      </GlassCard>
      {blockedUserIds.length > 0 && (
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('friends.blockedTitle')}</Text>
          {blockedUserIds.map((userId) => <Pressable key={userId} accessibilityRole="button" onPress={() => { social.unblock(LOCAL_USER_ID, userId); unblockUser(userId); setNotice(t('friends.unblocked')); refresh(); }} style={[styles.smallButton, { borderColor: colors.border }]}><Text style={[styles.smallLabel, { color: colors.text }]}>{t('friends.unblock')} · {userId}</Text></Pressable>)}
        </GlassCard>
      )}
      {notice.length > 0 && <Text accessibilityRole="alert" key={revision} style={[styles.notice, { color: palette.aquaDeep }]}>{notice}</Text>}
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
  addButton: { minHeight: 44, borderRadius: 22, backgroundColor: palette.aqua, justifyContent: 'center', paddingHorizontal: space.md },
  addLabel: { color: palette.ink, fontSize: 12, fontWeight: '900' },
  compactActions: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  friendColumn: { gap: space.sm, paddingVertical: space.xs },
  friendActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  smallButton: { minHeight: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', paddingHorizontal: space.sm },
  smallLabel: { fontSize: 12, fontWeight: '800' },
  notice: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
});
