import type { ChatMessage, ChatReport, ProviderStatus } from './contracts';

const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
const FILTERED_TERMS = ['aptal', 'idiot'] as const;

function filterBody(value: string): string {
  return FILTERED_TERMS.reduce(
    (body, term) => body.replace(new RegExp(`\\b${term}\\b`, 'giu'), '•••'),
    value,
  );
}

export class MockChatAdapter {
  public readonly status: ProviderStatus = {
    mode: 'mock',
    ready: true,
    humanTodo: 'Connect authenticated room chat to the Cloudflare room service and moderation queue.',
  };

  private readonly messages: ChatMessage[] = [];
  private readonly blockedPairs = new Set<string>();
  private readonly mutedPairs = new Set<string>();
  private readonly reports: ChatReport[] = [];
  private readonly recentBySender = new Map<string, number[]>();

  public block(viewerId: string, senderId: string): void {
    this.blockedPairs.add(`${viewerId}:${senderId}`);
  }

  public mute(viewerId: string, senderId: string): void {
    this.mutedPairs.add(`${viewerId}:${senderId}`);
  }

  public unmute(viewerId: string, senderId: string): void {
    this.mutedPairs.delete(`${viewerId}:${senderId}`);
  }

  public send(input: { roomId: string; senderId: string; body: string; now: number }): ChatMessage {
    const body = filterBody(input.body.trim());
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
    return this.messages.filter((message) => {
      const pair = `${viewerId}:${message.senderId}`;
      return message.roomId === roomId
        && message.expiresAt > now
        && !this.blockedPairs.has(pair)
        && !this.mutedPairs.has(pair);
    });
  }

  public report(input: { reporterId: string; messageId: string; reason: ChatReport['reason']; now: number }): ChatReport {
    const message = this.messages.find((candidate) => candidate.id === input.messageId);
    if (message === undefined) throw new Error('Chat message does not exist');
    if (message.senderId === input.reporterId) throw new Error('Cannot report your own message');
    const duplicate = this.reports.find((candidate) => candidate.reporterId === input.reporterId && candidate.messageId === input.messageId);
    if (duplicate !== undefined) return duplicate;
    const report: ChatReport = {
      id: `report_${input.reporterId}_${input.messageId}`,
      roomId: message.roomId,
      reporterId: input.reporterId,
      reportedUserId: message.senderId,
      messageId: message.id,
      reason: input.reason,
      createdAt: input.now,
    };
    this.reports.push(report);
    return report;
  }

  public reportsFor(reporterId: string): readonly ChatReport[] {
    return this.reports.filter((report) => report.reporterId === reporterId);
  }
}
