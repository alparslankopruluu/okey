export const audioAssets = {
  music: [
    require('../../assets/audio/music/quiet-orbit.wav') as number,
    require('../../assets/audio/music/pearl-current.wav') as number,
    require('../../assets/audio/music/midnight-luma.wav') as number,
  ],
  effects: {
    tilePickup: require('../../assets/audio/effects/tile-pickup.wav') as number,
    tileDiscard: require('../../assets/audio/effects/tile-discard.wav') as number,
    meldOpen: require('../../assets/audio/effects/meld-open.wav') as number,
    warning: require('../../assets/audio/effects/rule-warning.wav') as number,
    gift: require('../../assets/audio/effects/gift-arrival.wav') as number,
    win: require('../../assets/audio/effects/win.wav') as number,
  },
  ambient: require('../../assets/audio/ambient/cafe-murmur.wav') as number,
} as const;

export type GameSound = keyof typeof audioAssets.effects;
