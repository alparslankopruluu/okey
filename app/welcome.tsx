import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LumaButton } from '../src/components/luma-button';
import { images } from '../src/assets';
import { palette, radius, space } from '../src/theme/tokens';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  return (
    <LinearGradient colors={['#09102A', '#192750', '#3B3373']} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <Image source={images.masterStyleFrame} style={styles.image} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(9,16,42,0.96)']} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{t('welcome.eyebrow')}</Text>
          <Text style={styles.title}>{t('welcome.title')}</Text>
          <Text style={styles.body}>{t('welcome.body')}</Text>
          <LumaButton label={t('welcome.cta')} onPress={() => router.replace('/(tabs)/home')} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, justifyContent: 'flex-end' },
  hero: { flex: 1, margin: space.md, borderRadius: radius.lg, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  copy: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.md },
  eyebrow: { color: palette.aqua, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: palette.pearl, fontSize: 36, lineHeight: 40, fontWeight: '900', letterSpacing: -1.1 },
  body: { color: palette.mutedDark, fontSize: 16, lineHeight: 23 },
});
