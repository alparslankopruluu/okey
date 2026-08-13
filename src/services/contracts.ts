export type ProviderMode = 'mock' | 'live';

export interface ProviderStatus {
  readonly mode: ProviderMode;
  readonly ready: boolean;
  readonly humanTodo: string;
}

export interface AuthSession {
  readonly userId: string;
  readonly provider: 'anonymous' | 'apple' | 'google';
  readonly isGuest: boolean;
}

export interface ChatMessage {
  readonly id: string;
  readonly roomId: string;
  readonly senderId: string;
  readonly body: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}

export interface ChatReport {
  readonly id: string;
  readonly roomId: string;
  readonly reporterId: string;
  readonly reportedUserId: string;
  readonly messageId: string;
  readonly reason: 'harassment' | 'spam' | 'other';
  readonly createdAt: number;
}

export interface VoiceState {
  readonly joined: boolean;
  readonly reconnecting: boolean;
  readonly muted: boolean;
  readonly pushToTalkActive: boolean;
  readonly recordingEnabled: false;
}
