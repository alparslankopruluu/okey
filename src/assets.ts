import type { ImageSourcePropType } from 'react-native';

export const images = {
  masterStyleFrame: require('../assets/game/table-style-frame.png') as ImageSourcePropType,
  darkRoom: require('../assets/game/room-dark.png') as ImageSourcePropType,
  avatars: [
    require('../assets/game/avatars/avatar-01.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-02.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-03.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-04.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-05.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-06.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-07.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-08.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-09.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-10.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-11.png') as ImageSourcePropType,
    require('../assets/game/avatars/avatar-12.png') as ImageSourcePropType,
  ],
} as const;
