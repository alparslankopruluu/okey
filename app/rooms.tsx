import { router } from 'expo-router';
import { LockKeyhole, UsersRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../src/components/glass-card';
import { LumaButton } from '../src/components/luma-button';
import { Screen } from '../src/components/screen';
import { useAppTheme } from '../src/hooks/use-app-theme';
import { filterRooms, MOCK_ROOMS, roomAccess, roomEconomyMode } from '../src/services/room-catalog';
import { useAppStore } from '../src/stores/app-store';
import { palette, radius, space } from '../src/theme/tokens';

export default function RoomsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [filter, setFilter] = useState<'all' | 'casual' | 'chip'>('all');
  const level = useAppStore((state) => state.playerLevel);
  const chips = useAppStore((state) => state.chips);
  const rooms = useMemo(() => filterRooms(MOCK_ROOMS, filter), [filter]);
  return (
    <Screen title={t('room.title')} eyebrow={t('room.profile', { level, chips })}>
      <View style={styles.filters}>
        {(['all', 'casual', 'chip'] as const).map((item) => (
          <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)} style={[styles.filter, { backgroundColor: filter === item ? palette.aqua : colors.surface }]}>
            <Text style={{ color: filter === item ? palette.ink : colors.text, fontWeight: '800' }}>{t(`room.filter.${item}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.disclaimer, { color: colors.muted }]}>{t('room.mockChipNotice')}</Text>
      {rooms.map((room) => {
        const access = roomAccess(room, { level, chips });
        return (
          <GlassCard key={room.id} style={styles.roomCard}>
            <View style={[styles.roomIcon, { backgroundColor: room.theme === 'kahvehane' ? 'rgba(232,199,122,0.15)' : 'rgba(41,225,214,0.13)' }]}><UsersRound color={room.theme === 'kahvehane' ? palette.gold : palette.aquaDeep} /></View>
            <View style={styles.roomBody}>
              <Text style={[styles.roomTitle, { color: colors.text }]}>{t(`room.name.${room.id}`)}</Text>
              <Text style={[styles.roomMeta, { color: colors.muted }]}>{t('room.meta', { variant: room.variant === 'classic' ? t('create.classic') : t('create.101'), level: room.minLevel, seated: room.seated })}</Text>
              <Text style={[styles.entry, { color: room.entryChips === 0 ? palette.aqua : palette.gold }]}>{room.entryChips === 0 ? t('room.free') : t('room.mockEntry', { chips: room.entryChips })}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={access === 'open' ? t('room.join') : t(`room.lock.${access}`, { level: room.minLevel, chips: room.entryChips })}
              accessibilityState={{ disabled: access !== 'open' }}
              disabled={access !== 'open'}
              onPress={() => router.push({ pathname: '/game/[roomId]', params: { roomId: room.id, variant: room.variant, seed: String(Date.now() % 1_000_000), economyMode: roomEconomyMode(room.entryChips), entryChips: String(room.entryChips), tableTheme: room.theme } })}
              style={[styles.join, { backgroundColor: access === 'open' ? palette.aqua : colors.elevated }]}
            >
              {access === 'open' ? <Text style={styles.joinText}>{t('room.join')}</Text> : <LockKeyhole size={18} color={colors.muted} />}
            </Pressable>
          </GlassCard>
        );
      })}
      <LumaButton label={t('room.create')} onPress={() => router.push('/create-room')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: space.xs },
  filter: { flex: 1, minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { fontSize: 12, lineHeight: 17 },
  roomCard: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  roomIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  roomBody: { flex: 1, gap: 3 },
  roomTitle: { fontSize: 17, fontWeight: '900' },
  roomMeta: { fontSize: 12, lineHeight: 16 },
  entry: { fontSize: 12, fontWeight: '900' },
  join: { minWidth: 58, minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  joinText: { color: palette.ink, fontSize: 12, fontWeight: '900' },
});
