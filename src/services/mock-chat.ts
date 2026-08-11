import type { ChatMessage, ProviderStatus } from './contracts';

const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;

export class MockChatAdapter {
  public readonly status: ProviderStatus = {
    mode: 'mock',
    ready: true,
    humanTodo: 'Connect authenticated room chat to the Cloudflare room service and moderation queue.',
  };

  private readonly messages: ChatMessage[] = [];
  private readonly blockedPairs = new Set<string>();
  private readonly recentBySender = new Map<string, number[]>();

  public block(viewerId: string, senderId: string): void {
    this.blockedPairs.add(`${viewerId}:${senderId}`);
  }

  public send(input: { roomId: string; senderId: string; body: string; now: number }): ChatMessage {
    const body = input.body.trim();
    if (body.length === 0 || body.length > 240) throw new Error('Chat messages must contain 1 to 240 characters');
    const recent = (this.recentBySender.get(input.senderId) ?? []).filter((timestamp) => input.now - timestamp < 10_000);
    if (recent.length >= 5) throw new Error('Chat rate limit exceeded');
    this.recentBySender.set(input.senderId, [...recent, input.now]);
    const message: ChatMessage = {
      id: `mock_${input.senderId}_${String(input.now)}_${String(recent.length)}`,
      roomId: input.roomId,
      senderId: input.senderId,
      body,
      createdAt: input.now,
      expiresAt: input.now + MESSAGE_TTL_MS,
    };
    this.messages.push(message);
    return message;
  }

  public list(roomId: string, viewerId: string, now: number): readonly ChatMessage[] {
    return this.messages.filter((message) => message.roomId === roomId && message.expiresAt > now && !this.blockedPairs.has(`${viewerId}:${message.senderId}`));
  }
}
