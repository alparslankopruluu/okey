export const featureFlags = {
  onlineRooms: false,
  voice: false,
  store: false,
  chipRooms: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;
