import { Bell, Check, Gift, UserPlus, UsersRound, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../hooks/use-app-theme';
import { palette, radius, space } from '../theme/tokens';
import { useAppStore } from '../stores/app-store';

export interface NotificationPreview {
  readonly id: string;
  readonly kind: 'friend_request' | 'friend_accepted' | 'room_invite' | 'gift_received';
  readonly actor: string;
  readonly read: boolean;
}

const iconFor = (kind: NotificationPreview['kind']) => kind === 'gift_received' ? Gift : kind === 'room_invite' ? UsersRound : kind === 'friend_accepted' ? Check : UserPlus;

export function NotificationBell({ notifications, visible, onOpen, onClose, onRead }: {
  readonly notifications: readonly NotificationPreview[];
  readonly visible: boolean;
  readonly onOpen: () => void;
  readonly onClose: () => void;
  readonly onRead: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const unread = notifications.filter((notification) => !notification.read).length;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={t('notifications.title')} onPress={onOpen} style={[styles.bell, { backgroundColor: colors.surface }]}>
        <Bell size={19} color={unread > 0 ? palette.aquaDeep : colors.muted} />
        {unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>}
      </Pressable>
      <Modal
        animationType={reducedMotion ? 'none' : 'fade'}
        transparent
        visible={visible}
        onRequestClose={onClose}
        supportedOrientations={['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']}
      >
        <Pressable onPress={onClose} style={styles.scrim}>
          <Pressable onPress={(event) => event.stopPropagation()} style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{t('notifications.title')}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8} onPress={onClose} style={styles.close}><X color={colors.text} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {notifications.map((notification) => {
                const Icon = iconFor(notification.kind);
                const label = t(`notifications.${notification.kind}`, { actor: notification.actor });
                return <Pressable key={notification.id} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: notification.read }} onPress={() => onRead(notification.id)} style={[styles.row, { backgroundColor: notification.read ? colors.elevated : 'rgba(41,225,214,0.10)' }]}>
                  <Icon accessibilityElementsHidden size={20} color={palette.aquaDeep} /><Text style={[styles.copy, { color: colors.text }]}>{label}</Text>
                </Pressable>;
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: 4, top: 3, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: palette.coral, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: palette.white, fontSize: 10, fontWeight: '900' },
  scrim: { flex: 1, backgroundColor: 'rgba(3,7,24,0.72)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 70, paddingHorizontal: space.md },
  sheet: { width: '100%', maxWidth: 390, borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  list: { gap: space.sm, paddingBottom: space.xs },
  title: { fontSize: 20, fontWeight: '900' },
  row: { minHeight: 54, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm },
  copy: { flex: 1, fontSize: 14, fontWeight: '700' },
});
