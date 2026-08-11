import { Coins, Crown, RotateCcw } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../src/components/glass-card';
import { LumaButton } from '../../src/components/luma-button';
import { Screen } from '../../src/components/screen';
import { useAppTheme } from '../../src/hooks/use-app-theme';
import { palette, space } from '../../src/theme/tokens';

export default function StoreScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const products = [
    { id: 'chips_small', title: t('store.small'), amount: '5K', icon: <Coins color={palette.aquaDeep} /> },
    { id: 'chips_medium', title: t('store.medium'), amount: '15K', icon: <Coins color={palette.lilac} /> },
    { id: 'chips_large', title: t('store.large'), amount: '40K', icon: <Coins color={palette.coral} /> },
  ];
  return (
    <Screen title={t('store.title')} eyebrow={t('common.mock')}>
      <Text style={[styles.body, { color: colors.muted }]}>{t('store.body')}</Text>
      <View style={styles.products}>
        {products.map((product) => (
          <GlassCard key={product.id} style={styles.product}>
            {product.icon}
            <Text style={[styles.productTitle, { color: colors.text }]}>{product.title}</Text>
            <Text style={[styles.amount, { color: colors.text }]}>{product.amount}</Text>
            <LumaButton label={t('common.mock')} variant="secondary" disabled onPress={() => undefined} />
          </GlassCard>
        ))}
      </View>
      <GlassCard>
        <Crown color={palette.gold} size={30} />
        <Text style={[styles.productTitle, { color: colors.text }]}>{t('store.vipYearly')}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t('store.vipBenefit')}</Text>
        <View style={styles.vipRow}>
          <LumaButton label={t('store.vipWeekly')} variant="secondary" disabled onPress={() => undefined} style={styles.flex} />
          <LumaButton label={t('store.vipYearly')} disabled onPress={() => undefined} style={styles.flex} />
        </View>
      </GlassCard>
      <LumaButton label={t('store.restore')} icon={<RotateCcw color={colors.text} size={18} />} variant="secondary" disabled onPress={() => undefined} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { fontSize: 14, lineHeight: 21 },
  products: { flexDirection: 'row', gap: space.sm },
  product: { flex: 1, padding: space.md, alignItems: 'center' },
  productTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  amount: { fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  vipRow: { flexDirection: 'row', gap: space.sm },
});
