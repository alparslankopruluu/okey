export const PUSH_TYPES = ['friend_request', 'friend_accepted', 'room_invite', 'gift_received'] as const;

export type PushType = typeof PUSH_TYPES[number];

export interface SafePushPayload {
  readonly type: PushType;
  readonly notificationId: string;
  readonly deepLinkId: string;
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function parsePushPayload(data: Readonly<Record<string, unknown>> | undefined): SafePushPayload | undefined {
  if (data === undefined || Object.keys(data).some((key) => !['type', 'notificationId', 'deepLinkId'].includes(key))) return undefined;
  const type = data.type;
  const notificationId = data.notificationId;
  const deepLinkId = data.deepLinkId;
  if (typeof type !== 'string' || !PUSH_TYPES.includes(type as PushType)) return undefined;
  if (typeof notificationId !== 'string' || !SAFE_ID.test(notificationId)) return undefined;
  if (typeof deepLinkId !== 'string' || !SAFE_ID.test(deepLinkId)) return undefined;
  return { type: type as PushType, notificationId, deepLinkId };
}
