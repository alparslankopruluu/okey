import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Coins, Music2, UsersRound } from 'lucide-react-native';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../src/components/glass-card';
import { images } from '../../src/assets';
import { LumaButton } from '../../src/components/luma-button';
import { Screen } from '../../src/components/screen';
import { useAppTheme } from '../../src/hooks/use-app-theme';
import { useAppStore } from '../../src/stores/app-store';
import { palette, radius, space } from '../../src/theme/tokens';
import { NotificationBell, type NotificationPreview } from '../../src/components/notification-sheet';
import { useState } from 'react';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const chips = useAppStore((state) => state.chips);
  const musicPlaying = useAppStore((state) => state.musicPlaying);
  const toggleMusic = useAppStore((state) => state.toggleMusic);
  const lastDailyClaim = useAppStore((state) => state.lastDailyClaim);
  const dailyStreak = useAppStore((state) => state.dailyStreak);
  const claimDaily = useAppStore((state) => state.claimDaily);
  const today = new Date().toISOString().slice(0, 10);
  const claimed = lastDailyClaim === today;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([
    { id: 'welcome-request', kind: 'friend_request', actor: 'Ada', read: false },
    { id: 'welcome-gift', kind: 'gift_received', actor: 'Mert', read: false },
  ]);
  return (
    <Screen
      eyebrow={t('home.greeting')}
      title={t('appName')}
      right={(
        <View style={styles.headerActions}>
          <NotificationBell notifications={notifications} visible={notificationsOpen} onOpen={() => setNotificationsOpen(true)} onClose={() => setNotificationsOpen(false)} onRead={(id) => setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item))} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('settings.music')} onPress={toggleMusic} style={[styles.music, { backgroundColor: colors.surface }]}>
            <Music2 size={19} color={musicPlaying ? palette.aquaDeep : colors.muted} />
          </Pressable>
        </View>
      )}
    >
      <View style={styles.balanceRow} accessibilityLabel={t('a11y.chips', { count: chips })}>
        <Coins size={18} color={palette.gold} />
        <Text style={[styles.balance, { color: colors.text }]}>{chips.toLocaleString()}</Text>
        <Text style={[styles.balanceLabel, { color: colors.muted }]}>{t('home.balance')}</Text>
      </View>

      <ImageBackground source={images.darkRoom} imageStyle={styles.heroImage} style={styles.hero}>
        <LinearGradient colors={['rgba(10,16,40,0.12)', 'rgba(10,16,40,0.96)']} style={styles.heroShade}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('home.quickTitle')}</Text>
            <Text style={styles.heroBody}>{t('home.quickBody')}</Text>
            <LumaButton label={t('home.quickCta')} onPress={() => router.push('/offline')} />
          </View>
        </LinearGradient>
      </ImageBackground>

      <GlassCard>
        <View style={styles.cardTitleRow}>
          <View style={styles.iconBubble}><UsersRound size={20} color={palette.aquaDeep} /></View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('home.rooms')}</Text>
            <Text style={[styles.cardBody, { color: colors.muted }]}>{t('home.roomsBody')}</Text>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <LumaButton label={t('home.createRoom')} variant="secondary" onPress={() => router.push('/create-room')} style={styles.flex} />
          <LumaButton label={t('home.findRoom')} variant="secondary" onPress={() => router.push('/rooms')} style={styles.flex} />
        </View>
      </GlassCard>

      <LinearGradient colors={['rgba(184,155,255,0.35)', 'rgba(41,225,214,0.22)']} style={[styles.daily, { borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t('home.daily')}</Text>
        <View style={styles.orbs}>
          {[250, 300, 350, 400, 500, 750, 1000].map((value, index) => (
            <View key={value} style={[styles.orb, { opacity: index < dailyStreak ? 1 : 0.34 }]} />
          ))}
        </View>
        <LumaButton
          label={claimed ? t('home.claimed') : t('home.claim', { amount: [250, 300, 350, 400, 500, 750, 1000][Math.min(dailyStreak, 6)] })}
          disabled={claimed}
          onPress={() => { claimDaily(today); }}
        />
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  music: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: space.xs },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  balance: { fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  balanceLabel: { fontSize: 13 },
  hero: { height: 350, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end' },
  heroImage: { borderRadius: radius.lg },
  heroShade: { flex: 1, justifyContent: 'flex-end' },
  heroCopy: { padding: space.lg, gap: space.sm },
  heroTitle: { color: palette.pearl, fontSize: 27, fontWeight: '900', letterSpacing: -0.6 },
  heroBody: { color: palette.mutedDark, fontSize: 14, lineHeight: 20, marginBottom: space.xs },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  iconBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(41,225,214,0.18)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardBody: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  buttonRow: { flexDirection: 'row', gap: space.sm },
  daily: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.md },
  orbs: { flexDirection: 'row', justifyContent: 'space-between' },
  orb: { width: 26, height: 26, borderRadius: 13, backgroundColor: palette.aqua, shadowColor: palette.aqua, shadowOpacity: 0.8, shadowRadius: 10 },
});
