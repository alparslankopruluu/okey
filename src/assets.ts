import type { ImageSourcePropType } from 'react-native';

export const images = {
  masterStyleFrame: require('../assets/game/table-style-frame.png') as ImageSourcePropType,
  darkRoom: require('../assets/game/room-dark.png') as ImageSourcePropType,
  avatars: [
    require('../assets/game/avatars/v2/avatar-01.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-02.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-03.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-04.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-05.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-06.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-07.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-08.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-09.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-10.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-11.png') as ImageSourcePropType,
    require('../assets/game/avatars/v2/avatar-12.png') as ImageSourcePropType,
  ],
  rack: require('../assets/game/racks/luma-rack-v1.png') as ImageSourcePropType,
  gifts: {
    tea: require('../assets/game/gifts/gift-tea-v1.png') as ImageSourcePropType,
    coffee: require('../assets/game/gifts/gift-coffee-v1.png') as ImageSourcePropType,
    chocolate: require('../assets/game/gifts/gift-chocolate-v1.png') as ImageSourcePropType,
    rose: require('../assets/game/gifts/gift-rose-v1.png') as ImageSourcePropType,
    tespih: require('../assets/game/gifts/gift-tespih-v1.png') as ImageSourcePropType,
    cake: require('../assets/game/gifts/gift-cake-v1.png') as ImageSourcePropType,
  },
} as const;
