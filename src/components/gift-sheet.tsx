import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { images } from '../assets';
import { GIFT_CATALOG, type GiftId } from '../services/gifts';
import { useAppTheme } from '../hooks/use-app-theme';
import { palette, radius, space } from '../theme/tokens';

const imageKey: Record<GiftId, keyof typeof images.gifts> = {
  tea: 'tea', coffee: 'coffee', chocolate: 'chocolate', rose: 'rose', prayer_beads: 'tespih', cake: 'cake',
};

export function GiftSheet({ visible, recipient, onClose, onSend }: {
  readonly visible: boolean;
  readonly recipient: string;
  readonly onClose: () => void;
  readonly onSend: (giftId: GiftId) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.scrim}>
        <Pressable accessibilityRole="none" onPress={(event) => event.stopPropagation()} style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('gift.title', { player: recipient })}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{t('gift.body')}</Text>
          <View style={styles.grid}>
            {GIFT_CATALOG.map((gift) => (
              <Pressable key={gift.id} accessibilityRole="button" accessibilityLabel={t(`gift.${gift.id}`, { cost: gift.chipCost })} onPress={() => onSend(gift.id)} style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                <Image source={images.gifts[imageKey[gift.id]]} style={styles.image} />
                <Text style={[styles.name, { color: colors.text }]}>{t(`gift.name.${gift.id}`)}</Text>
                <Text style={styles.cost}>{t('gift.cost', { cost: gift.chipCost })}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function giftImageKey(id: GiftId): keyof typeof images.gifts { return imageKey[id]; }

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(3,7,24,0.72)', justifyContent: 'flex-end', padding: space.md },
  sheet: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  title: { fontSize: 21, fontWeight: '900' },
  body: { fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  card: { width: '31%', minWidth: 92, flexGrow: 1, borderWidth: 1, borderRadius: radius.md, padding: space.xs, alignItems: 'center' },
  image: { width: 74, height: 74 },
  name: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  cost: { color: palette.aqua, fontSize: 11, fontWeight: '900', marginTop: 2 },
});
