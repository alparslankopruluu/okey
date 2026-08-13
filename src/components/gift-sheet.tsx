import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { images } from '../assets';
import { GIFT_CATALOG, type GiftId } from '../services/gifts';
import { useAppTheme } from '../hooks/use-app-theme';
import { palette, radius, space } from '../theme/tokens';
import { useAppStore } from '../stores/app-store';
import { AvatarMedallion } from './avatar-medallion';

const imageKey: Record<GiftId, keyof typeof images.gifts> = {
  tea: 'tea', coffee: 'coffee', chocolate: 'chocolate', rose: 'rose', prayer_beads: 'tespih', cake: 'cake',
};

export function GiftSheet({ visible, recipient, recipientAvatarIndex, balance, cooldownUntil, onClose, onSend }: {
  readonly visible: boolean;
  readonly recipient: string;
  readonly recipientAvatarIndex: number;
  readonly balance: number;
  readonly cooldownUntil?: number | undefined;
  readonly onClose: () => void;
  readonly onSend: (giftId: GiftId) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const [selected, setSelected] = useState<GiftId>('tea');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  useEffect(() => {
    if (!visible || cooldownUntil === undefined) return;
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 250);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [cooldownUntil, visible]);
  const selectedGift = useMemo(() => GIFT_CATALOG.find((gift) => gift.id === selected) ?? GIFT_CATALOG[0], [selected]);
  const canSend = remainingSeconds === 0 && balance >= selectedGift.chipCost;
  const landscape = width > height;
  return (
    <Modal animationType={reducedMotion ? 'none' : 'fade'} transparent visible={visible} onRequestClose={onClose} supportedOrientations={['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']}>
      <View style={[styles.scrim, landscape && styles.landscapeScrim]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={[styles.sheet, landscape && styles.landscapeSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.recipient}>
              <AvatarMedallion index={recipientAvatarIndex} size={54} active />
              <View style={styles.recipientCopy}>
                <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{t('gift.title', { player: recipient })}</Text>
                <Text style={[styles.balance, { color: colors.muted }]}>{t('gift.balance', { balance })}</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8} onPress={onClose} style={styles.close}><X color={colors.text} /></Pressable>
          </View>
          <Text style={[styles.body, { color: colors.muted }]}>{t('gift.body')}</Text>
          <ScrollView contentContainerStyle={[styles.grid, landscape && styles.landscapeGridContent]} showsVerticalScrollIndicator={false} style={landscape ? styles.landscapeGrid : undefined}>
            {GIFT_CATALOG.map((gift) => {
              const affordable = gift.chipCost <= balance;
              const active = selected === gift.id;
              return (
                <Pressable
                  key={gift.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`${t(`gift.name.${gift.id}`)}, ${t('gift.cost', { cost: gift.chipCost })}`}
                  accessibilityState={{ checked: active, disabled: !affordable }}
                  onPress={() => setSelected(gift.id)}
                  style={[styles.card, landscape && styles.landscapeCard, { backgroundColor: colors.elevated, borderColor: active ? palette.aqua : colors.border, opacity: affordable ? 1 : 0.45 }]}
                >
                  {active && <View style={styles.check}><Check size={14} color={palette.ink} /></View>}
                  <Image source={images.gifts[imageKey[gift.id]]} style={[styles.image, landscape && styles.landscapeImage]} />
                  <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{t(`gift.name.${gift.id}`)}</Text>
                  <Text style={styles.cost}>{t('gift.cost', { cost: gift.chipCost })}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={remainingSeconds > 0 ? t('gift.cooldown', { seconds: remainingSeconds }) : t('gift.confirm', { gift: t(`gift.name.${selected}`), player: recipient })}
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={() => onSend(selected)}
            style={[styles.confirm, { opacity: canSend ? 1 : 0.46 }]}
          >
            <Text style={styles.confirmLabel}>{remainingSeconds > 0 ? t('gift.cooldown', { seconds: remainingSeconds }) : balance < selectedGift.chipCost ? t('gift.insufficient') : t('gift.confirm', { gift: t(`gift.name.${selected}`), player: recipient })}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function giftImageKey(id: GiftId): keyof typeof images.gifts { return imageKey[id]; }

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(3,7,24,0.76)', justifyContent: 'flex-end', padding: space.md },
  landscapeScrim: { alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { maxHeight: '92%', borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  landscapeSheet: { width: '62%', maxWidth: 680, maxHeight: '94%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  recipient: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  recipientCopy: { flex: 1 },
  close: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '900' },
  balance: { fontSize: 12, fontWeight: '800', marginTop: 3 },
  body: { fontSize: 13, lineHeight: 18 },
  landscapeGrid: { height: 190 },
  landscapeGridContent: { minHeight: 184 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  card: { position: 'relative', width: '30%', minWidth: 90, flexGrow: 1, borderWidth: 2, borderRadius: radius.md, padding: space.xs, alignItems: 'center' },
  landscapeCard: { minHeight: 84, paddingVertical: 3 },
  check: { position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: palette.aqua, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  image: { width: 68, height: 68 },
  landscapeImage: { width: 44, height: 44 },
  name: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  cost: { color: palette.aqua, fontSize: 11, fontWeight: '900', marginTop: 2 },
  confirm: { minHeight: 50, borderRadius: radius.pill, backgroundColor: palette.aqua, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  confirmLabel: { color: palette.ink, fontSize: 14, fontWeight: '900', textAlign: 'center' },
});
