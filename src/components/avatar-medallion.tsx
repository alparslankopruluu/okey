import { Image, StyleSheet, View } from 'react-native';
import { images } from '../assets';
import { palette } from '../theme/tokens';

export function AvatarMedallion({ index, size = 64, active = false }: { index: number; size?: number; active?: boolean }) {
  const source = images.avatars[((index % images.avatars.length) + images.avatars.length) % images.avatars.length];
  if (source === undefined) throw new Error('Avatar source is unavailable');
  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: active ? palette.aqua : 'rgba(184,155,255,0.48)',
          shadowColor: active ? palette.aqua : palette.lilac,
        },
      ]}
    >
      <Image source={source} style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});
