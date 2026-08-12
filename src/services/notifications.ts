export type NotificationKind = 'friend_request' | 'friend_accepted' | 'room_invite' | 'gift_received';

export type SafeDeepLink =
  | { readonly screen: 'friends'; readonly requestId?: string; readonly friendshipId?: string }
  | { readonly screen: 'room'; readonly roomId: string; readonly inviteId?: string; readonly giftId?: string };

export interface SocialNotification {
  readonly id: string;
  readonly userId: string;
  readonly kind: NotificationKind;
  readonly deepLink: SafeDeepLink;
  readonly createdAt: number;
  readonly readAt?: number;
}

function assertIdentifier(value: string, name: string): void {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error(`${name} must be a safe identifier`);
}

function matchesCreatePayload(existing: SocialNotification, incoming: Omit<SocialNotification, 'readAt'>): boolean {
  return existing.id === incoming.id
    && existing.userId === incoming.userId
    && existing.kind === incoming.kind
    && existing.createdAt === incoming.createdAt
    && JSON.stringify(existing.deepLink) === JSON.stringify(incoming.deepLink);
}

/** Notifications retain only route identifiers, never text, chips, rack state, or device tokens. */
export class InMemoryNotificationCenter {
  private readonly notifications = new Map<string, SocialNotification>();

  public create(notification: Omit<SocialNotification, 'readAt'>): SocialNotification {
    assertIdentifier(notification.id, 'Notification id');
    assertIdentifier(notification.userId, 'User id');
    this.assertDeepLink(notification.deepLink);
    const existing = this.notifications.get(notification.id);
    if (existing !== undefined) {
      if (!matchesCreatePayload(existing, notification)) throw new Error('Notification id was reused with another payload');
      return existing;
    }
    this.notifications.set(notification.id, notification);
    return notification;
  }

  public list(userId: string): readonly SocialNotification[] {
    return [...this.notifications.values()].filter((notification) => notification.userId === userId).sort((left, right) => right.createdAt - left.createdAt);
  }

  public markRead(userId: string, notificationId: string, now: number): SocialNotification {
    const existing = this.notifications.get(notificationId);
    if (existing === undefined || existing.userId !== userId) throw new Error('Notification not found');
    if (existing.readAt !== undefined) return existing;
    const next = { ...existing, readAt: now };
    this.notifications.set(notificationId, next);
    return next;
  }

  private assertDeepLink(deepLink: SafeDeepLink): void {
    if (deepLink.screen === 'friends') {
      if (deepLink.requestId !== undefined) assertIdentifier(deepLink.requestId, 'Request id');
      if (deepLink.friendshipId !== undefined) assertIdentifier(deepLink.friendshipId, 'Friendship id');
      return;
    }
    assertIdentifier(deepLink.roomId, 'Room id');
    if (deepLink.inviteId !== undefined) assertIdentifier(deepLink.inviteId, 'Invite id');
    if (deepLink.giftId !== undefined) assertIdentifier(deepLink.giftId, 'Gift id');
  }
}
