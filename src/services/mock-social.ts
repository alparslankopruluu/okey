const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface SocialProfile {
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  readonly avatarId?: string;
  readonly usernameChangedAt: number;
}

export interface Friendship {
  readonly id: string;
  readonly requesterId: string;
  readonly recipientId: string;
  readonly status: 'pending' | 'accepted';
  readonly createdAt: number;
  readonly respondedAt?: number;
}

export interface RoomInvite {
  readonly id: string;
  readonly roomId: string;
  readonly senderId: string;
  readonly recipientId: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}

function normalizedUsername(username: string): string {
  if (!USERNAME_PATTERN.test(username)) throw new Error('Username must be 3-20 ASCII letters, digits, or underscores');
  return username.toLowerCase();
}

function pairId(first: string, second: string): string {
  return [first, second].sort().join(':');
}

function assertDisplayName(displayName: string): void {
  if (displayName.trim().length < 1 || displayName.length > 50) throw new Error('Display name must be 1-50 characters');
}

export class InMemoryFriendshipService {
  private readonly profiles = new Map<string, SocialProfile>();
  private readonly usernames = new Map<string, string>();
  private readonly friendships = new Map<string, Friendship>();
  private readonly blockedPairs = new Set<string>();
  private readonly requestTimes = new Map<string, number[]>();
  private inviteSequence = 0;

  public register(input: { readonly userId: string; readonly username: string; readonly displayName: string; readonly avatarId?: string; readonly now: number }): SocialProfile {
    if (this.profiles.has(input.userId)) throw new Error('Profile already exists');
    const normalized = normalizedUsername(input.username);
    if (this.usernames.has(normalized)) throw new Error('Username is already taken');
    assertDisplayName(input.displayName);
    const profile: SocialProfile = { userId: input.userId, username: input.username, displayName: input.displayName, ...(input.avatarId === undefined ? {} : { avatarId: input.avatarId }), usernameChangedAt: input.now };
    this.profiles.set(input.userId, profile);
    this.usernames.set(normalized, input.userId);
    return profile;
  }

  public renameUsername(userId: string, username: string, now: number): SocialProfile {
    const profile = this.requireProfile(userId);
    if (now - profile.usernameChangedAt < THIRTY_DAYS_MS) throw new Error('Username can only change every 30 days');
    const normalized = normalizedUsername(username);
    const owner = this.usernames.get(normalized);
    if (owner !== undefined && owner !== userId) throw new Error('Username is already taken');
    this.usernames.delete(normalizedUsername(profile.username));
    const next = { ...profile, username, usernameChangedAt: now };
    this.profiles.set(userId, next);
    this.usernames.set(normalized, userId);
    return next;
  }

  public updateDisplayName(userId: string, displayName: string): SocialProfile {
    const profile = this.requireProfile(userId);
    assertDisplayName(displayName);
    const next = { ...profile, displayName };
    this.profiles.set(userId, next);
    return next;
  }

  public search(viewerId: string, query: string): readonly SocialProfile[] {
    if (!/^[A-Za-z0-9_]{1,20}$/.test(query)) throw new Error('Username search must use letters, digits, or underscores');
    const normalized = query.toLowerCase();
    return [...this.profiles.values()]
      .filter((profile) => profile.userId !== viewerId && !this.isBlocked(viewerId, profile.userId) && normalizedUsername(profile.username).startsWith(normalized))
      .sort((left, right) => left.username.localeCompare(right.username))
      .slice(0, 20);
  }

  public sendRequest(requesterId: string, recipientId: string, now: number): Friendship {
    this.requireProfile(requesterId);
    this.requireProfile(recipientId);
    if (requesterId === recipientId) throw new Error('Cannot send a friend request to yourself');
    if (this.isBlocked(requesterId, recipientId)) throw new Error('Blocked users cannot send friend requests');
    const requests = this.requestTimes.get(requesterId) ?? [];
    const withinDay = requests.filter((timestamp) => now - timestamp < DAY_MS && timestamp <= now);
    if (withinDay.filter((timestamp) => now - timestamp < HOUR_MS).length >= 10) throw new Error('Friend request hourly limit exceeded');
    if (withinDay.length >= 50) throw new Error('Friend request daily limit exceeded');
    const id = pairId(requesterId, recipientId);
    const existing = this.friendships.get(id);
    if (existing !== undefined) throw new Error(existing.status === 'accepted' ? 'Users are already friends' : 'Friend request already exists');
    const friendship: Friendship = { id, requesterId, recipientId, status: 'pending', createdAt: now };
    this.friendships.set(id, friendship);
    this.requestTimes.set(requesterId, [...withinDay, now]);
    return friendship;
  }

  public respondToRequest(recipientId: string, requesterId: string, accept: boolean, now: number): Friendship | undefined {
    const id = pairId(requesterId, recipientId);
    const friendship = this.friendships.get(id);
    if (friendship === undefined || friendship.status !== 'pending' || friendship.requesterId !== requesterId || friendship.recipientId !== recipientId) throw new Error('No pending friend request for this recipient');
    if (!accept) {
      this.friendships.delete(id);
      return undefined;
    }
    const accepted: Friendship = { ...friendship, status: 'accepted', respondedAt: now };
    this.friendships.set(id, accepted);
    return accepted;
  }

  public removeFriend(firstUserId: string, secondUserId: string): void {
    const id = pairId(firstUserId, secondUserId);
    const friendship = this.friendships.get(id);
    if (friendship === undefined || friendship.status !== 'accepted') throw new Error('Users are not friends');
    this.friendships.delete(id);
  }

  public block(blockerId: string, targetId: string): void {
    this.requireProfile(blockerId);
    this.requireProfile(targetId);
    if (blockerId === targetId) throw new Error('Cannot block yourself');
    const id = pairId(blockerId, targetId);
    this.blockedPairs.add(id);
    this.friendships.delete(id);
  }

  public isBlocked(firstUserId: string, secondUserId: string): boolean {
    return this.blockedPairs.has(pairId(firstUserId, secondUserId));
  }

  public inviteToRoom(input: { readonly senderId: string; readonly recipientId: string; readonly roomId: string; readonly now: number; readonly expiresAt: number }): RoomInvite {
    if (!this.areFriends(input.senderId, input.recipientId)) throw new Error('Only friends can receive room invites');
    if (this.isBlocked(input.senderId, input.recipientId)) throw new Error('Blocked users cannot receive room invites');
    if (input.expiresAt <= input.now) throw new Error('Room invite expiry must be in the future');
    this.inviteSequence += 1;
    return {
      id: `invite_${String(this.inviteSequence)}`,
      roomId: input.roomId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      createdAt: input.now,
      expiresAt: input.expiresAt,
    };
  }

  public areFriends(firstUserId: string, secondUserId: string): boolean {
    return this.friendships.get(pairId(firstUserId, secondUserId))?.status === 'accepted';
  }

  private requireProfile(userId: string): SocialProfile {
    const profile = this.profiles.get(userId);
    if (profile === undefined) throw new Error('Unknown social profile');
    return profile;
  }
}
